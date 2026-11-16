"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, Check, SkipForward, X } from "lucide-react";
import { RecoveryStatus, WorkoutLog } from "@/lib/types";
import { VoiceInputButton } from "./VoiceInputButton";

interface WithingsFeelingsPromptModalProps {
  log: WorkoutLog | null;
  onSave: (updatedLog: WorkoutLog) => void;
  onSkip: (logId: string) => void;
}

const RECOVERY_OPTIONS: { value: RecoveryStatus; label: string }[] = [
  { value: "erinomainen", label: "Erinomainen" },
  { value: "normaali", label: "Normaali" },
  { value: "tukkoinen", label: "Tukkoinen" },
  { value: "flunssainen", label: "Flunssainen" },
];

export function WithingsFeelingsPromptModal({
  log,
  onSave,
  onSkip,
}: WithingsFeelingsPromptModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [note, setNote] = useState("");
  const [rpe, setRpe] = useState<number>(7);
  const [recoveryStatus, setRecoveryStatus] =
    useState<RecoveryStatus>("normaali");

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    if (log) {
      setNote("");
      setRpe(typeof log.rpe === "number" ? log.rpe : 7);
      setRecoveryStatus(log.recoveryStatus || "normaali");
      if (!dlg.open) {
        dlg.showModal();
      }
    } else if (dlg.open) {
      dlg.close();
    }
  }, [log]);

  const handleVoiceTranscript = (spoken: string) => {
    setNote((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
  };

  const handleSave = () => {
    if (!log) return;
    const trimmed = note.trim();
    const existingWithingsInfo = log.feelings
      ? log.feelings.replace(/^Tuotu Withingsistä:\s*/i, "Withings: ")
      : "";
    const combinedFeelings = trimmed
      ? existingWithingsInfo
        ? `${trimmed} ${existingWithingsInfo}`
        : trimmed
      : log.feelings;

    onSave({
      ...log,
      rpe,
      recoveryStatus,
      feelings: combinedFeelings,
    });
  };

  const handleSkip = () => {
    if (!log) return;
    onSkip(log.id);
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      onCancel={(e) => {
        e.preventDefault();
        handleSkip();
      }}
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-white/15 bg-[#121622]/95 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-md"
    >
      {log && (
        <div className="space-y-4 p-5 sm:p-6">
          {/* Yläpalkki */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#30D158]/15 text-[#30D158]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#30D158]">
                  Tuotu Withingsistä
                </p>
                <h2 className="text-base font-bold text-white leading-snug">
                  {log.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              aria-label="Ohita"
              className="rounded-xl p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Kello-data tiivistettynä */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-zinc-300">
            <span className="font-semibold text-zinc-200">
              {log.performedDate}
            </span>
            {log.feelings ? (
              <p className="mt-1 text-zinc-400 leading-relaxed">
                {log.feelings.replace(/^Tuotu Withingsistä:\s*/i, "")}
              </p>
            ) : null}
          </div>

          {/* Vapaaehtoinen sanelu & tuntemukset */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="withings-feelings-input"
                className="text-xs font-semibold text-zinc-200"
              >
                Haluatko lisätä lyhyet tuntemukset? (vapaaehtoinen)
              </label>
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                label="Sanele"
                compact
              />
            </div>
            <textarea
              id="withings-feelings-input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Esim. Kevyt aamulenkki, jalat tuntuivat tuoreilta..."
              className="w-full rounded-2xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#409CFF] focus:outline-none"
            />
          </div>

          {/* Nopea kuormitus & vireys */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                Rasitus (RPE {rpe}/10)
              </label>
              <input
                type="range"
                min={3}
                max={10}
                step={0.5}
                value={rpe}
                onChange={(e) => setRpe(parseFloat(e.target.value))}
                className="w-full accent-[#409CFF]"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                Vireystila
              </span>
              <div className="grid grid-cols-2 gap-1">
                {RECOVERY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecoveryStatus(opt.value)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                      recoveryStatus === opt.value
                        ? "bg-[#409CFF]/25 text-[#409CFF] ring-1 ring-[#409CFF]/50"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toiminnot: Tallenna tai Ohita */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSkip}
              className="apple-press flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <SkipForward className="h-4 w-4" />
              <span>Ohita</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="apple-press flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#30D158] px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110"
            >
              <Check className="h-4 w-4" />
              <span>Tallenna tuntemukset</span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
