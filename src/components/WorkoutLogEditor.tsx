"use client";

import { RecoveryStatus, SportCategory, WorkoutLog } from "@/lib/types";
import {
  applyDistanceKmToTitleAndFeelings,
  cleanSpokenToSelkosuomi,
  extractDistanceKmFromLog,
  parseSpokenWorkout,
} from "@/lib/workoutParser";
import { Check, Save, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import {
  CHARACTER_LABELS,
  CharacterSportType,
  SportCharacterAvatar,
} from "./SportCharacterAvatar";
import { VoiceInputButton } from "./VoiceInputButton";

interface WorkoutLogEditorProps {
  log: WorkoutLog;
  onSave: (updatedLog: WorkoutLog) => void;
  onCancel: () => void;
  onDelete?: (logId: string) => void;
}

export function WorkoutLogEditor({
  log,
  onSave,
  onCancel,
  onDelete,
}: WorkoutLogEditorProps) {
  const initialKm = extractDistanceKmFromLog(log);
  const [draft, setDraft] = useState<WorkoutLog>(() =>
    JSON.parse(JSON.stringify(log))
  );
  const [distanceKmStr, setDistanceKmStr] = useState<string>(
    initialKm !== null ? String(initialKm).replace(".", ",") : ""
  );
  const [polishing, setPolishing] = useState<boolean>(false);

  const handleDistanceChange = (val: string) => {
    setDistanceKmStr(val);
    const updated = applyDistanceKmToTitleAndFeelings(
      draft.title,
      draft.feelings || "",
      val
    );
    setDraft((prev) => ({
      ...prev,
      title: updated.title,
      feelings: updated.feelings,
    }));
  };

  const applyCharacterPreset = (charType: CharacterSportType) => {
    const mapping: Record<
      CharacterSportType,
      { cat: SportCategory; prefix: string }
    > = {
      runner: { cat: "run", prefix: "Juoksu" },
      lifter: { cat: "strength", prefix: "Voimatreeni" },
      skier: { cat: "ski", prefix: "Hiihto" },
      tennis: { cat: "tennis", prefix: "Tennis" },
      badminton: { cat: "other", prefix: "Sulkapallo" },
      golf: { cat: "other", prefix: "Golf" },
      recovery: { cat: "other", prefix: "Kehonhuolto" },
    };
    const m = mapping[charType];
    const kmPart = distanceKmStr.trim()
      ? ` · ${distanceKmStr.trim().replace(".", ",")} km`
      : "";
    const durPart = draft.durationMinutes
      ? ` · ${draft.durationMinutes} min`
      : "";
    setDraft((prev) => ({
      ...prev,
      category: m.cat,
      title: `${m.prefix}${kmPart}${durPart}`,
    }));
  };

  const handlePolishToSelkosuomi = (rawInput: string) => {
    const cleaned = cleanSpokenToSelkosuomi(rawInput);
    const parsed = parseSpokenWorkout(rawInput, draft.performedDate);

    // Jos sanelussa mainittiin kilometrit (esim. "4,2 kilometriä"), poimitaan nekin suoraan!
    let nextKmStr = distanceKmStr;
    if (parsed.distanceKm !== null) {
      nextKmStr = String(parsed.distanceKm).replace(".", ",");
      setDistanceKmStr(nextKmStr);
    }

    const withKm = applyDistanceKmToTitleAndFeelings(
      draft.title,
      cleaned,
      nextKmStr
    );

    setDraft((prev) => ({
      ...prev,
      title: withKm.title,
      feelings: withKm.feelings,
    }));

    setPolishing(true);
    void fetch("/api/selkosuomi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawText: rawInput,
        mode: draft.category === "strength" ? "strength" : "run",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.selkosuomiText) {
          const applied = applyDistanceKmToTitleAndFeelings(
            draft.title,
            data.selkosuomiText,
            nextKmStr
          );
          setDraft((prev) => ({
            ...prev,
            title: applied.title,
            feelings: applied.feelings,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setPolishing(false));
  };

  const updateExerciseSet = (
    exId: string,
    setId: string,
    field: "actualReps" | "actualWeightKg",
    value: string
  ) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id !== setId
                  ? s
                  : {
                      ...s,
                      [field]: value,
                      reps: field === "actualReps" ? value : s.reps,
                      weightKg: field === "actualWeightKg" ? value : s.weightKg,
                    }
              ),
            }
      ),
    }));
  };

  const handleSave = () => {
    const finalApplied = applyDistanceKmToTitleAndFeelings(
      draft.title,
      cleanSpokenToSelkosuomi(draft.feelings || ""),
      distanceKmStr
    );
    onSave({
      ...draft,
      title: finalApplied.title,
      feelings: finalApplied.feelings,
    });
  };

  return (
    <div className="mt-2 pt-3 border-t border-white/15 space-y-3.5 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <SportCharacterAvatar
            category={draft.category}
            title={draft.title}
            feelings={draft.feelings}
            size="sm"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-[#30D158]">
            Muokkaa suoritusta (tallentuu suoraan Supabaseen)
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="apple-press p-1.5 rounded-full bg-white/10 text-zinc-300 hover:text-white"
          aria-label="Sulje muokkaus"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Lajihahmon pikavalinta */}
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
          Laji & kuvahahmo:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              "runner",
              "lifter",
              "skier",
              "tennis",
              "badminton",
              "golf",
              "recovery",
            ] as CharacterSportType[]
          ).map((cType) => (
            <button
              key={cType}
              type="button"
              onClick={() => applyCharacterPreset(cType)}
              className="apple-press px-2.5 py-1 rounded-xl bg-black/50 hover:bg-white/15 border border-white/15 text-xs font-semibold text-zinc-200"
            >
              {CHARACTER_LABELS[cType]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Otsikko, Matka (km, esim. Withingsistä), Kesto (min) & Päivämäärä */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div className="col-span-2 sm:col-span-3">
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
            Suorituksen otsikko
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full rounded-xl bg-black/60 border border-white/20 px-3 py-1.5 text-xs sm:text-sm font-bold text-white focus:border-[#0A84FF] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#30D158] mb-1">
            Matka (km)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={distanceKmStr}
            onChange={(e) => handleDistanceChange(e.target.value)}
            placeholder="esim. 3,8"
            className="w-full rounded-xl bg-black/60 border border-[#34C759]/50 px-2.5 py-1.5 text-xs sm:text-sm font-bold text-[#30D158] placeholder:text-zinc-500 focus:border-[#34C759] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
            Kesto (min)
          </label>
          <input
            type="number"
            min={0}
            max={600}
            value={draft.durationMinutes ?? 0}
            onChange={(e) =>
              setDraft({
                ...draft,
                durationMinutes: parseInt(e.target.value, 10) || 0,
              })
            }
            className="w-full rounded-xl bg-black/60 border border-white/20 px-2.5 py-1.5 text-xs sm:text-sm font-bold text-white focus:border-[#0A84FF] focus:outline-none"
          />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
            Päivä
          </label>
          <input
            type="date"
            value={draft.performedDate}
            onChange={(e) =>
              setDraft({ ...draft, performedDate: e.target.value })
            }
            className="w-full rounded-xl bg-black/60 border border-white/20 px-2 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
          />
        </div>
      </div>

      {/* 3. Happi (1–5), Voimat/Vire (1–5) & Palautumistila */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <span className="block text-[11px] font-semibold text-zinc-300 mb-1">
            Happi (1–5)
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDraft({ ...draft, oxygenScore: n })}
                className={`apple-press flex-1 py-1 rounded-lg text-xs font-bold border ${
                  (draft.oxygenScore || 4) === n
                    ? "bg-[#34C759]/25 border-[#34C759] text-[#30D158]"
                    : "bg-black/40 border-white/10 text-zinc-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-semibold text-zinc-300 mb-1">
            Voimat / vireys (1–5)
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDraft({ ...draft, energyScore: n })}
                className={`apple-press flex-1 py-1 rounded-lg text-xs font-bold border ${
                  (draft.energyScore || 4) === n
                    ? "bg-[#0A84FF]/25 border-[#0A84FF] text-[#64D2FF]"
                    : "bg-black/40 border-white/10 text-zinc-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
            Palautumistila
          </label>
          <select
            value={draft.recoveryStatus}
            onChange={(e) =>
              setDraft({
                ...draft,
                recoveryStatus: e.target.value as RecoveryStatus,
              })
            }
            className="w-full rounded-xl bg-black/60 border border-white/20 px-2.5 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
          >
            <option value="erinomainen">Erinomainen / terävä</option>
            <option value="normaali">Normaali</option>
            <option value="tukkoinen">Tukkoinen / väsynyt</option>
            <option value="flunssainen">Flunssainen / nuha</option>
          </select>
        </div>
      </div>

      {/* 4. Jos voimatreeni: muokattavat liikkeet ja sarjat (toistot × kg) */}
      {draft.exercises && draft.exercises.length > 0 && (
        <div className="rounded-2xl bg-black/45 border border-white/12 p-3 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64D2FF]">
            Muokkaa suoritettuja sarjoja ja painoja (kg):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {draft.exercises.map((ex) => (
              <div
                key={ex.id}
                className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 space-y-1.5"
              >
                <div className="text-xs font-bold text-white">{ex.name}</div>
                {ex.sets.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span className="text-[10px] text-zinc-400 w-5">
                      #{s.setNumber}
                    </span>
                    <input
                      type="text"
                      value={s.actualReps || s.reps}
                      onChange={(e) =>
                        updateExerciseSet(
                          ex.id,
                          s.id,
                          "actualReps",
                          e.target.value
                        )
                      }
                      className="w-11 rounded-lg bg-black/60 border border-white/15 px-1.5 py-0.5 text-center text-xs font-bold text-white"
                    />
                    <span className="text-zinc-500">×</span>
                    <input
                      type="text"
                      value={s.actualWeightKg || s.weightKg}
                      onChange={(e) =>
                        updateExerciseSet(
                          ex.id,
                          s.id,
                          "actualWeightKg",
                          e.target.value
                        )
                      }
                      className="flex-1 min-w-0 rounded-lg bg-black/60 border border-white/15 px-1.5 py-0.5 text-center text-xs font-bold text-[#30D158]"
                    />
                    <span className="text-[10px] text-zinc-400">kg</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Yhteenveto & tuntemukset + Sanele / Muotoile selkosuomeksi */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[11px] font-semibold text-zinc-300">
            Yhteenveto & tuntemukset (voit myös sanella kilometrit tähän)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePolishToSelkosuomi(draft.feelings || "")}
              className="apple-press px-2.5 py-1 rounded-xl bg-[#0A84FF]/25 border border-[#0A84FF]/50 text-[11px] font-semibold text-[#64D2FF]"
            >
              {polishing ? "Muotoillaan..." : "Muotoile selkosuomeksi"}
            </button>
            <VoiceInputButton
              onTranscript={(txt) => {
                const nextText = draft.feelings
                  ? `${draft.feelings} ${txt}`
                  : txt;
                handlePolishToSelkosuomi(nextText);
              }}
              label="Sanele / lisää km"
            />
          </div>
        </div>
        <textarea
          rows={2}
          value={draft.feelings}
          onChange={(e) => setDraft({ ...draft, feelings: e.target.value })}
          className="w-full rounded-xl bg-black/60 border border-white/20 p-2.5 text-xs sm:text-sm text-white focus:border-[#0A84FF] focus:outline-none"
        />
      </div>

      {/* 6. Tallenna / Poista / Peruuta */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(draft.id)}
            className="apple-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FF453A]/15 hover:bg-[#FF453A]/25 border border-[#FF453A]/35 text-xs font-semibold text-[#FF6961]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Poista suoritus</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="apple-press px-3.5 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-zinc-300"
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="apple-press inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#34C759] text-black text-xs font-bold shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Tallenna muutokset Supabaseen</span>
          </button>
        </div>
      </div>
    </div>
  );
}
