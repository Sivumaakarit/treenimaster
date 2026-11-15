"use client";

import { SPORT_CATEGORIES } from "@/lib/programData";
import { RecoveryStatus, SportCategory, WorkoutLog } from "@/lib/types";
import { Check, Sparkles, X } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";
import { VoiceInputButton } from "./VoiceInputButton";

interface QuickOtherWorkoutModalProps {
  isOpen: boolean;
  initialDate: string;
  onClose: () => void;
  onSaveLog: (log: WorkoutLog) => void;
  onSendToCoach?: (naturalText: string) => Promise<void>;
}

const QUICK_CATEGORIES: SportCategory[] = [
  "run",
  "tennis",
  "ski",
  "other",
  "rest",
  "strength",
];

export function QuickOtherWorkoutModal({
  isOpen,
  initialDate,
  onClose,
  onSaveLog,
  onSendToCoach,
}: QuickOtherWorkoutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [performedDate, setPerformedDate] = useState(initialDate);
  const [category, setCategory] = useState<SportCategory>("run");
  const [title, setTitle] = useState("Aamulenkki kevyellä sykkeellä");
  const [durationMinutes, setDurationMinutes] = useState("25");
  const [rpe, setRpe] = useState("6.0");
  const [oxygenScore, setOxygenScore] = useState<number>(5);
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [recoveryStatus, setRecoveryStatus] =
    useState<RecoveryStatus>("erinomainen");
  const [feelings, setFeelings] = useState("");
  const [aiParsing, setAiParsing] = useState(false);

  useEffect(() => {
    setPerformedDate(initialDate);
  }, [initialDate]);

  // Native <dialog> open/close management + Safari closedBy fallback per modern-web-guidance
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback for browsers without native closedby="any" support
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) {
          dialog.close();
        }
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      return () => {
        dialog.removeEventListener("close", handleClose);
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  const handleSelectCategory = (cat: SportCategory) => {
    setCategory(cat);
    const defaults: Record<SportCategory, { t: string; d: string; rpe: string }> = {
      run: { t: "Kevyt juoksulenkki (PK1)", d: "25", rpe: "6.0" },
      tennis: { t: "Tennis – pelit & pallottelu", d: "60", rpe: "7.5" },
      ski: { t: "Hiihtolenkki", d: "45", rpe: "7.0" },
      other: { t: "Kehonhuolto / muu liikunta", d: "30", rpe: "5.5" },
      rest: { t: "Lepopäivä – hermoston palautuminen", d: "0", rpe: "1.0" },
      strength: { t: "Ylimääräinen voimaharjoitus", d: "50", rpe: "8.0" },
    };
    setTitle(defaults[cat].t);
    setDurationMinutes(defaults[cat].d);
    setRpe(defaults[cat].rpe);
  };

  const handleVoiceTranscript = (text: string) => {
    const nextFeelings = feelings ? `${feelings} ${text}` : text;
    setFeelings(nextFeelings);

    // Älykäs esitäyttö puheesta
    const lower = text.toLowerCase();
    if (lower.includes("tenni")) {
      setCategory("tennis");
      setTitle("Tennis");
    } else if (lower.includes("hiihd") || lower.includes("hiiht")) {
      setCategory("ski");
      setTitle("Hiihtolenkki");
    } else if (lower.includes("juoks") || lower.includes("lenk")) {
      setCategory("run");
      setTitle(lower.includes("aamu") ? "Aamulenkki" : "Juoksulenkki");
    } else if (lower.includes("lepo")) {
      setCategory("rest");
      setTitle("Lepopäivä");
      setDurationMinutes("0");
    }

    const minMatch = lower.match(/(\d+)\s*(min|minuuttia)/i);
    if (minMatch) {
      setDurationMinutes(minMatch[1]);
    } else if (lower.includes("tunnin") || lower.includes("tunti")) {
      setDurationMinutes("60");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(durationMinutes, 10);
    const rpeVal = parseFloat(rpe);

    const newLog: WorkoutLog = {
      id: `log-${Date.now()}`,
      performedDate,
      category,
      title:
        title.trim() ||
        SPORT_CATEGORIES[category].label,
      cycleNumber: null,
      workoutNumber: null,
      programId: null,
      durationMinutes: Number.isNaN(dur) ? null : dur,
      rpe: Number.isNaN(rpeVal) ? null : rpeVal,
      exercises: [],
      feelings:
        feelings.trim() ||
        "Suoritus kirjattu suoraan kalenteriin ja Supabaseen.",
      oxygenScore,
      energyScore,
      recoveryStatus,
      source: "calendar",
      createdAt: new Date().toISOString(),
    };

    onSaveLog(newLog);
    dialogRef.current?.close();
  };

  const handleAnalyzeWithCoach = async () => {
    if (!onSendToCoach) return;
    const summaryText =
      feelings.trim() ||
      `Tein ${performedDate}: ${title} (${durationMinutes} min). Happi ${oxygenScore}/5, voimat ${energyScore}/5, vire: ${recoveryStatus}.`;
    setAiParsing(true);
    try {
      await onSendToCoach(summaryText);
      dialogRef.current?.close();
    } finally {
      setAiParsing(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ closedby: "any" } as any)}
      aria-labelledby={titleId}
      className="rounded-3xl outline-none"
    >
      <div className="apple-glass-heavy rounded-3xl p-5 sm:p-6 text-[#F5F5F7] border border-white/15 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#0A84FF]">
              Poikkeaminen saliohjelmasta / kalenterikirjaus
            </span>
            <h2 id={titleId} className="apple-title mt-0.5 text-white">
              Kirjaa muu treeni, lenkki tai lepopäivä
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Sulje ikkuna"
            className="apple-press p-2 rounded-full bg-white/8 hover:bg-white/14 text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Puhesyöttö */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-300">
              <strong className="text-white block mb-0.5">
                Nopea puhesyöttö (fi-FI)
              </strong>
              Sano esim.{" "}
              <em>
                &ldquo;Juoksin tänään aamulenkin 22 minuuttia kevyellä sykkeellä&rdquo;
              </em>
            </div>
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              label="Sanele suoritus"
            />
          </div>

          {/* Lajivalinta Apple-väreillä */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Valitse laji (värikoodattu kalenteriin)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_CATEGORIES.map((catId) => {
                const meta = SPORT_CATEGORIES[catId];
                const active = category === catId;
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => handleSelectCategory(catId)}
                    className={`apple-press flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                      active
                        ? "bg-white/15 border-white/40 text-white shadow-sm"
                        : "bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${meta.dotClass}`}
                    />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Päivämäärä, otsikko ja kesto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="quick-date"
                className="block text-xs font-medium text-zinc-300 mb-1"
              >
                Päivämäärä
              </label>
              <input
                id="quick-date"
                type="date"
                value={performedDate}
                onChange={(e) => setPerformedDate(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="quick-title"
                className="block text-xs font-medium text-zinc-300 mb-1"
              >
                Suorituksen otsikko
              </label>
              <input
                id="quick-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Esim. Aamulenkki PK1 tai Tennis"
                className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                required
              />
            </div>
          </div>

          {category !== "rest" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quick-duration"
                  className="block text-xs font-medium text-zinc-300 mb-1"
                >
                  Kesto (min)
                </label>
                <input
                  id="quick-duration"
                  type="number"
                  min={0}
                  max={480}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="quick-rpe"
                  className="block text-xs font-medium text-zinc-300 mb-1"
                >
                  Kuormitus (RPE 1–10)
                </label>
                <input
                  id="quick-rpe"
                  type="number"
                  step="0.5"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Subjektiiviset mittarit: Happi, Voimat, Palautuminen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <span className="block text-xs font-medium text-zinc-300 mb-1.5">
                Miten happi kulki? (1–5)
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setOxygenScore(n)}
                    className={`apple-press flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                      oxygenScore === n
                        ? "bg-[#34C759]/25 border-[#34C759] text-[#30D158]"
                        : "bg-white/[0.04] border-white/10 text-zinc-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-zinc-300 mb-1.5">
                Jaksaminen / voimat (1–5)
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergyScore(n)}
                    className={`apple-press flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                      energyScore === n
                        ? "bg-[#0A84FF]/25 border-[#0A84FF] text-[#409CFF]"
                        : "bg-white/[0.04] border-white/10 text-zinc-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="quick-recovery"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Hermoston & kehon vire
              </label>
              <select
                id="quick-recovery"
                value={recoveryStatus}
                onChange={(e) =>
                  setRecoveryStatus(e.target.value as RecoveryStatus)
                }
                className="w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
              >
                <option value="erinomainen">Erinomainen / tuore</option>
                <option value="normaali">Normaali</option>
                <option value="tukkoinen">Tukkoinen / raskaat jalat</option>
                <option value="flunssainen">Flunssainen / nuha</option>
              </select>
            </div>
          </div>

          {/* Vapaa tuntemuskenttä */}
          <div>
            <label
              htmlFor="quick-feelings"
              className="block text-xs font-medium text-zinc-300 mb-1"
            >
              Tuntemukset ja huomiot valmentajalle
            </label>
            <textarea
              id="quick-feelings"
              rows={3}
              value={feelings}
              onChange={(e) => setFeelings(e.target.value)}
              placeholder="Esim. Happi kulki tosi hyvin ja jaksoin loppuun asti, syke pysyi matalana..."
              className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#0A84FF] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="apple-press px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs sm:text-sm font-medium text-zinc-300"
            >
              Peruuta
            </button>
            {onSendToCoach && (
              <button
                type="button"
                disabled={aiParsing}
                onClick={handleAnalyzeWithCoach}
                className="apple-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/40 text-xs sm:text-sm font-semibold text-[#64D2FF]"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {aiParsing
                    ? "Valmentaja kirjaa..."
                    : "Kirjaa & pyydä valmentajan analyysi"}
                </span>
              </button>
            )}
            <button
              type="submit"
              className="apple-press inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#34C759] hover:bg-[#30D158] text-xs sm:text-sm font-semibold text-black shadow-lg shadow-[#34C759]/20"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Tallenna kalenteriin</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
