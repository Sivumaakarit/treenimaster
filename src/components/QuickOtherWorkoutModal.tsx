"use client";

import { SPORT_CATEGORIES } from "@/lib/programData";
import { RecoveryStatus, SportCategory, WorkoutLog } from "@/lib/types";
import {
  cleanSpokenToSelkosuomi,
  formatStandardWorkoutTitle,
  parseSpokenFeelingsToSelkosuomi,
  parseSpokenWorkout,
} from "@/lib/workoutParser";
import { Check, Sparkles, X } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { SportCharacterAvatar } from "./SportCharacterAvatar";
import { VoiceInputButton } from "./VoiceInputButton";
import { WithingsConnectCard } from "./WithingsConnectCard";

interface QuickOtherWorkoutModalProps {
  isOpen: boolean;
  initialDate: string;
  onClose: () => void;
  onSaveLog: (log: WorkoutLog) => void;
  onSyncedWithingsLogs?: (logs: WorkoutLog[], message: string) => void;
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

const RUN_TYPES = ["Kevyt PK", "Intervalli", "Reipas VK", "Palauttava PK1"];

const RUN_DEVIATION_CHIPS = [
  "Suunnitelman mukaan ✓",
  "Kevyt & palauttava",
  "Jalat hieman raskaat salista",
  "Aikapula – lyhyempi suoritus",
  "Tukkoisuutta / huonot unet",
];

export function QuickOtherWorkoutModal({
  isOpen,
  initialDate,
  onClose,
  onSaveLog,
  onSyncedWithingsLogs,
  onSendToCoach,
}: QuickOtherWorkoutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const [performedDate, setPerformedDate] = useState(initialDate);
  const [category, setCategory] = useState<SportCategory>("run");
  const [workoutType, setWorkoutType] = useState<string>("Kevyt PK");
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState("25");
  const [rpe, setRpe] = useState("6.0");
  const [oxygenScore, setOxygenScore] = useState<number>(5);
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [recoveryStatus, setRecoveryStatus] =
    useState<RecoveryStatus>("erinomainen");
  const [deviationChip, setDeviationChip] = useState<string>(
    "Suunnitelman mukaan ✓"
  );
  const [feelings, setFeelings] = useState("");
  const [aiParsing, setAiParsing] = useState(false);

  useEffect(() => {
    setPerformedDate(initialDate);
  }, [initialDate]);

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

  const parsedKm = useMemo(() => {
    if (!distanceKm.trim()) return null;
    const n = parseFloat(distanceKm.replace(",", "."));
    return Number.isNaN(n) || n <= 0 ? null : n;
  }, [distanceKm]);

  const parsedDur = useMemo(() => {
    const n = parseInt(durationMinutes, 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  }, [durationMinutes]);

  const standardizedTitle = useMemo(
    () =>
      formatStandardWorkoutTitle({
        category,
        workoutType,
        distanceKm: parsedKm,
        durationMinutes: category === "rest" ? 0 : parsedDur,
      }),
    [category, workoutType, parsedKm, parsedDur]
  );

  const handleSelectCategory = (cat: SportCategory) => {
    setCategory(cat);
    const defaults: Record<
      SportCategory,
      { type: string; d: string; rpe: string }
    > = {
      run: { type: "Kevyt PK", d: "25", rpe: "6.0" },
      tennis: { type: "Pelit & pallottelu", d: "60", rpe: "7.5" },
      ski: { type: "Vapaa / luistelu", d: "45", rpe: "7.0" },
      other: { type: "Kehonhuolto", d: "30", rpe: "5.5" },
      rest: { type: "Palautuminen", d: "0", rpe: "1.0" },
      strength: { type: "Voimaharjoitus", d: "50", rpe: "8.0" },
    };
    setWorkoutType(defaults[cat].type);
    setDurationMinutes(defaults[cat].d);
    setRpe(defaults[cat].rpe);
  };

  // Kun käyttäjä sanelee, jäsennetään automaattisesti laji, km, tyyppi (kevyt/intervalli), kesto, tuntemukset ja muunnetaan selkosuomeksi!
  const handleVoiceTranscript = (text: string) => {
    const combinedText = feelings ? `${feelings} ${text}` : text;
    const selko = parseSpokenFeelingsToSelkosuomi(combinedText, "run");
    setFeelings(selko.selkosuomiText);
    setDeviationChip(selko.suggestedDeviationChip);

    const parsed = parseSpokenWorkout(combinedText, performedDate);
    setCategory(parsed.category);
    setWorkoutType(parsed.workoutType);
    if (parsed.distanceKm !== null) {
      setDistanceKm(String(parsed.distanceKm).replace(".", ","));
    }
    setDurationMinutes(String(parsed.durationMinutes));
    setRpe(String(parsed.rpe));
    setOxygenScore(parsed.oxygenScore);
    setEnergyScore(parsed.energyScore);
    setRecoveryStatus(parsed.recoveryStatus);
    setPerformedDate(parsed.performedDate);

    // Viimeistellään sanelu selkosuomeksi taustalla
    void fetch("/api/selkosuomi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: combinedText, mode: "run" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.selkosuomiText) {
          setFeelings(data.selkosuomiText);
        }
      })
      .catch(() => {});
  };

  const buildStructuredFeelings = () => {
    const metaParts: string[] = [
      ...(parsedKm ? [`Matka: ${String(parsedKm).replace(".", ",")} km`] : []),
      ...(deviationChip && deviationChip !== "Suunnitelman mukaan ✓"
        ? [`[Huomio: ${deviationChip}]`]
        : []),
    ];
    const cleanNote = cleanSpokenToSelkosuomi(feelings);
    if (cleanNote && metaParts.length > 0) {
      return `${metaParts.join(" · ")}. ${cleanNote}`;
    }
    if (cleanNote) {
      return cleanNote;
    }
    return metaParts.length > 0
      ? metaParts.join(" · ")
      : `${workoutType}${parsedDur ? ` (${parsedDur} min)` : ""}.`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rpeVal = parseFloat(rpe);

    const newLog: WorkoutLog = {
      id: `log-${Date.now()}`,
      performedDate,
      category,
      title: standardizedTitle,
      cycleNumber: null,
      workoutNumber: null,
      programId: null,
      durationMinutes: category === "rest" ? 0 : parsedDur,
      rpe: Number.isNaN(rpeVal) ? null : rpeVal,
      exercises: [],
      feelings: buildStructuredFeelings(),
      oxygenScore,
      energyScore,
      recoveryStatus,
      source: "calendar",
      createdAt: new Date().toISOString(),
    };

    onSaveLog(newLog);
    setFeelings("");
    setDistanceKm("");
    dialogRef.current?.close();
  };

  const handleAnalyzeWithCoach = async () => {
    if (!onSendToCoach) return;
    const summaryText =
      feelings.trim() ||
      `Tein ${performedDate}: ${standardizedTitle}. Happi ${oxygenScore}/5, voimat ${energyScore}/5, vire: ${recoveryStatus}.`;
    setAiParsing(true);
    try {
      await onSendToCoach(summaryText);
      setFeelings("");
      setDistanceKm("");
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
      className="rounded-3xl outline-none mt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div className="apple-glass-heavy rounded-3xl p-4 sm:p-6 text-[#F5F5F7] border border-white/15 max-h-[84dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/10">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#30D158]">
              Lenkin & muun treenin kirjaus
            </span>
            <h2 id={titleId} className="apple-title mt-0.5 text-white">
              Sanele tai kirjaa suoritus
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
          {/* 0. Withings-yhdistäminen & suora haku */}
          <WithingsConnectCard
            compact
            onSyncedLogs={(synced, msg) => {
              onSyncedWithingsLogs?.(synced, msg);
              if (synced.length > 0) {
                dialogRef.current?.close();
              }
            }}
          />

          {/* 1. Puhesyöttö heti päällimmäisenä */}
          <div className="rounded-2xl bg-[#34C759]/10 border border-[#34C759]/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-200">
              <strong className="text-white block mb-0.5">
                Sanele lenkki tai treeni (poimii km, tyypin & keston)
              </strong>
              Sano esim.{" "}
              <em>
                &ldquo;Juoksin tänään 5 kilometriä kevyttä PK-lenkkiä 28 minuuttia, happi kulki hyvin&rdquo;
              </em>
            </div>
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              label="Sanele suoritus"
            />
          </div>

          {/* 2. Vakioitu esikatselukortti + hauska kuvahahmo (näyttää heti millainen merkintä kalenteriin syntyy) */}
          <div className="rounded-2xl border border-white/15 bg-black/50 p-3.5 flex items-start gap-3.5">
            <SportCharacterAvatar
              category={category}
              title={standardizedTitle}
              feelings={`${workoutType} ${feelings}`}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Muodostuva vakiomerkintä kalenteriin & päivän näkymään:
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  style={SPORT_CATEGORIES[category].badgeStyle}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SPORT_CATEGORIES[category].hex }}
                  />
                  {SPORT_CATEGORIES[category].shortLabel}
                </span>
                <span className="text-sm font-bold text-white">
                  {standardizedTitle}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-300">
                {buildStructuredFeelings()}
              </div>
            </div>
          </div>

          {/* 3. Lajivalinta & valmiit kuvahahmot (Juoksija, Hiihtäjä, Punttimies, Tennis, Sulkapallo, Golf, Huolto) */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Laji & kuvahahmo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: "Juoksija (Lenkki)", cat: "run" as SportCategory, type: "Kevyt PK", d: "25", rpe: "6.0" },
                { label: "Hiihtäjä (Hiihto)", cat: "ski" as SportCategory, type: "Vapaa / luistelu", d: "45", rpe: "7.0" },
                { label: "Tennis / Padel", cat: "tennis" as SportCategory, type: "Pelit & pallottelu", d: "60", rpe: "7.5" },
                { label: "Sulkapallo", cat: "other" as SportCategory, type: "Sulkapallo", d: "60", rpe: "7.5" },
                { label: "Golf", cat: "other" as SportCategory, type: "Golf", d: "120", rpe: "5.5" },
                { label: "Punttimies (Sali)", cat: "strength" as SportCategory, type: "Voimaharjoitus", d: "60", rpe: "8.0" },
                { label: "Kehonhuolto / Muu", cat: "other" as SportCategory, type: "Kehonhuolto", d: "30", rpe: "5.0" },
                { label: "Lepopäivä", cat: "rest" as SportCategory, type: "Palautuminen", d: "0", rpe: "1.0" },
              ].map((item) => {
                const active =
                  category === item.cat &&
                  (item.cat !== "other" || workoutType === item.type);
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setCategory(item.cat);
                      setWorkoutType(item.type);
                      setDurationMinutes(item.d);
                      setRpe(item.rpe);
                    }}
                    className={`apple-press flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-semibold border transition-all ${
                      active
                        ? "bg-white/15 border-white/40 text-white shadow-sm"
                        : "bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <SportCharacterAvatar
                      category={item.cat}
                      title={item.type}
                      size="sm"
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Lenkin tyyppi (Kevyt PK / Intervalli / Reipas VK) + Matka (km) + Kesto (min) */}
          {category !== "rest" && (
            <div className="space-y-3">
              {category === "run" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Lenkin luonne
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {RUN_TYPES.map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => setWorkoutType(rt)}
                        className={`apple-press rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          workoutType === rt
                            ? "border-[#34C759] bg-[#34C759]/20 text-[#30D158]"
                            : "border-white/10 bg-white/[0.04] text-zinc-300"
                        }`}
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="quick-distance"
                    className="block text-xs font-medium text-zinc-300 mb-1"
                  >
                    Matka (km)
                  </label>
                  <input
                    id="quick-distance"
                    type="text"
                    inputMode="decimal"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="esim. 5"
                    className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                  />
                </div>
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
                    className="w-full rounded-xl bg-black/40 border border-white/15 px-2.5 py-2 text-xs sm:text-sm text-white focus:border-[#0A84FF] focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Pikavalinta: Miten lenkki/treeni sujui tai miksi poikkesi? */}
          <div>
            <span className="block text-xs font-medium text-zinc-300 mb-1.5">
              Suorituksen toteutuma / mahdollinen poikkeaman syy:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {RUN_DEVIATION_CHIPS.map((chip) => {
                const active = deviationChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setDeviationChip(chip)}
                    className={`apple-press px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      active
                        ? chip === "Suunnitelman mukaan ✓" ||
                          chip === "Kevyt & palauttava"
                          ? "bg-[#34C759]/20 border-[#34C759] text-[#30D158]"
                          : "bg-[#FF9F0A]/20 border-[#FF9F0A] text-[#FFD60A]"
                        : "bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Tuntemukset & saneluteksti (selkosuomeksi Supabaseen) */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="quick-feelings"
                className="block text-xs font-medium text-zinc-300"
              >
                Miten treeni meni / miten happi ja voimat riittivät? (muuntuu selkosuomeksi)
              </label>
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                label="Sanele vastaus"
              />
            </div>
            <textarea
              id="quick-feelings"
              rows={2}
              value={feelings}
              onChange={(e) => {
                const val = e.target.value;
                setFeelings(val);
                const parsed = parseSpokenWorkout(val, performedDate);
                if (parsed.distanceKm !== null) {
                  setDistanceKm(String(parsed.distanceKm).replace(".", ","));
                }
                if (parsed.shouldLog) {
                  setWorkoutType(parsed.workoutType);
                }
              }}
              placeholder="Esim. Kevyt 5 km lenkki, happi kulki erinomaisesti ja syke pysyi matalana..."
              className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-[#0A84FF] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="apple-press px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-xs font-medium text-zinc-300"
            >
              Peruuta
            </button>
            {onSendToCoach && (
              <button
                type="button"
                disabled={aiParsing}
                onClick={handleAnalyzeWithCoach}
                className="apple-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/40 text-xs font-semibold text-[#64D2FF]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {aiParsing ? "Tallennetaan..." : "Tallenna & kysy valmentajalta"}
                </span>
              </button>
            )}
            <button
              type="submit"
              className="apple-press inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#34C759] hover:bg-[#30D158] text-xs font-semibold text-black shadow-lg shadow-[#34C759]/20"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Tallenna suoritus</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
