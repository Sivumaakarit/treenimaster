"use client";

import { NextWorkoutRecommendation } from "@/lib/storage";
import {
  ExercisePlan,
  ProgramWorkout,
  RecoveryStatus,
  WorkoutLog,
} from "@/lib/types";
import {
  Activity,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Edit3,
  Footprints,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { VoiceInputButton } from "./VoiceInputButton";

interface TodayWorkoutViewProps {
  todayISO: string;
  recommendation: NextWorkoutRecommendation;
  programs: ProgramWorkout[];
  activeWorkoutId: string;
  onSelectWorkoutId: (id: string) => void;
  onSaveStrengthLog: (log: WorkoutLog, askCoachAfter: boolean) => void;
  onOpenOtherWorkoutModal: () => void;
  onNavigateToProgram: () => void;
}

function formatFinnishDateFull(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const formatted = new Intl.DateTimeFormat("fi-FI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function TodayWorkoutView({
  todayISO,
  recommendation,
  programs,
  activeWorkoutId,
  onSelectWorkoutId,
  onSaveStrengthLog,
  onOpenOtherWorkoutModal,
  onNavigateToProgram,
}: TodayWorkoutViewProps) {
  const baseWorkout =
    programs.find((p) => p.id === activeWorkoutId) ||
    recommendation.nextWorkout;

  const [sessionExercises, setSessionExercises] = useState<ExercisePlan[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null
  );
  const [feelings, setFeelings] = useState("");
  const [oxygenScore, setOxygenScore] = useState<number>(4);
  const [energyScore, setEnergyScore] = useState<number>(4);
  const [recoveryStatus, setRecoveryStatus] =
    useState<RecoveryStatus>("normaali");
  const [durationMinutes, setDurationMinutes] = useState<string>("65");
  const [justSavedToast, setJustSavedToast] = useState<string | null>(null);

  // Alusta päivän muokattava kopio aina kun valittu pohjatreeni vaihtuu
  useEffect(() => {
    const cloned: ExercisePlan[] = baseWorkout.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({
        ...s,
        done: false,
        actualReps: s.reps,
        actualWeightKg: s.weightKg,
      })),
    }));
    setSessionExercises(cloned);
    setDurationMinutes(baseWorkout.workoutNumber === 1 ? "70" : "55");
  }, [baseWorkout]);

  const totalSetsCount = sessionExercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );
  const completedSetsCount = sessionExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.done).length,
    0
  );
  const progressPercent =
    totalSetsCount > 0
      ? Math.round((completedSetsCount / totalSetsCount) * 100)
      : 0;

  const toggleSetDone = (exerciseId: string, setId: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id !== setId ? s : { ...s, done: !s.done }
              ),
            }
      )
    );
  };

  const toggleAllExerciseSets = (exerciseId: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const allDone = ex.sets.every((s) => s.done);
        return {
          ...ex,
          sets: ex.sets.map((s) => ({ ...s, done: !allDone })),
        };
      })
    );
  };

  const markEntireWorkoutDone = () => {
    const allDone = sessionExercises.every((ex) =>
      ex.sets.every((s) => s.done)
    );
    setSessionExercises((prev) =>
      prev.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, done: !allDone })),
      }))
    );
  };

  const updateSetField = (
    exerciseId: string,
    setId: string,
    field: "actualReps" | "actualWeightKg",
    value: string
  ) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id !== setId ? s : { ...s, [field]: value, done: true }
              ),
            }
      )
    );
  };

  const updateExerciseName = (exerciseId: string, newName: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, name: newName } : ex))
    );
  };

  const resetToPlanned = () => {
    const cloned: ExercisePlan[] = baseWorkout.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({
        ...s,
        done: false,
        actualReps: s.reps,
        actualWeightKg: s.weightKg,
      })),
    }));
    setSessionExercises(cloned);
  };

  const handleCompleteWorkout = (askCoachAfter: boolean) => {
    // Jos käyttäjä painaa tallenna ilman että ruksasi sarjoja, merkitään kaikki suunnitellut sarjat tehdyiksi
    const normalizedExercises: ExercisePlan[] = sessionExercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({
        ...s,
        done: completedSetsCount === 0 ? true : Boolean(s.done),
        actualReps: s.actualReps || s.reps,
        actualWeightKg: s.actualWeightKg || s.weightKg,
      })),
    }));

    const dur = parseInt(durationMinutes, 10);

    const newLog: WorkoutLog = {
      id: `log-strength-${Date.now()}`,
      performedDate: todayISO,
      category: "strength",
      title: `${baseWorkout.title} (${baseWorkout.structureLabel})`,
      cycleNumber: baseWorkout.cycleNumber,
      workoutNumber: baseWorkout.workoutNumber,
      programId: baseWorkout.id,
      durationMinutes: Number.isNaN(dur) ? 65 : dur,
      rpe: baseWorkout.cycleNumber === 4 || baseWorkout.cycleNumber === 8 ? 6.0 : 8.5,
      exercises: normalizedExercises,
      feelings:
        feelings.trim() ||
        "Voimatreeni suoritettu suunnitelman mukaisesti. Hyvä tangon nopeus ja tekninen reservi.",
      oxygenScore,
      energyScore,
      recoveryStatus,
      source: "workout_view",
      createdAt: new Date().toISOString(),
    };

    onSaveStrengthLog(newLog, askCoachAfter);
    setJustSavedToast(
      `${baseWorkout.title} tallennettu Supabaseen ja kalenteriin!`
    );
    setFeelings("");
    setTimeout(() => setJustSavedToast(null), 5000);
  };

  const isRecommendedWorkout =
    baseWorkout.id === recommendation.nextWorkout.id;

  return (
    <div className="min-w-0 space-y-5">
      {/* Yläpalkki: Päivämäärä, palautumistila ja pikapoikkeus */}
      <section className="apple-glass min-w-0 overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0A84FF]/15 text-[#64D2FF] border border-[#0A84FF]/30">
                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                <span>{formatFinnishDateFull(todayISO)}</span>
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  recommendation.readinessState === "ready"
                    ? "bg-[#34C759]/15 text-[#30D158] border-[#34C759]/35"
                    : recommendation.readinessState === "completed_today"
                    ? "bg-[#0A84FF]/15 text-[#64D2FF] border-[#0A84FF]/35"
                    : "bg-[#FF9F0A]/15 text-[#FFD60A] border-[#FF9F0A]/35"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{recommendation.readinessHeadline}</span>
              </span>
            </div>

            <h1 className="apple-display text-white pt-1">
              Päivän treeni: {baseWorkout.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              {recommendation.readinessDetail}
            </p>
          </div>

          {/* Pikapainike muulle treenille / lenkille */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenOtherWorkoutModal}
              className="apple-press inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#34C759]/20 via-[#FF9F0A]/20 to-[#32ADE6]/20 hover:from-[#34C759]/30 hover:to-[#32ADE6]/30 border border-white/20 text-xs sm:text-sm font-semibold text-white shadow-md"
            >
              <Footprints className="w-4 h-4 shrink-0 text-[#30D158]" />
              <span>Teenkin tänään muun treenin / lenkin</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToProgram}
              className="apple-press inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-xs font-medium text-zinc-200"
            >
              <span>Katso koko 8 viikon ohjelma</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Liukuvan kierron pikavalitsin + edistymispalkki */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 w-full sm:w-auto flex-1">
            <label
              htmlFor="workout-selector"
              className="text-xs font-medium text-zinc-400 shrink-0"
            >
              Valittu harjoitus:
            </label>
            <select
              id="workout-selector"
              value={baseWorkout.id}
              onChange={(e) => onSelectWorkoutId(e.target.value)}
              className="w-full sm:w-auto max-w-full min-w-0 truncate rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs sm:text-sm font-medium text-white focus:border-[#0A84FF] focus:outline-none"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.structureLabel})
                  {p.id === recommendation.nextWorkout.id ? " ★" : ""}
                </option>
              ))}
            </select>

            {!isRecommendedWorkout && (
              <button
                type="button"
                onClick={() =>
                  onSelectWorkoutId(recommendation.nextWorkout.id)
                }
                className="apple-press text-left sm:text-center text-xs text-[#64D2FF] hover:underline px-1 py-1"
              >
                Palauta suositeltuun ({recommendation.nextWorkout.title})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={markEntireWorkoutDone}
              className="apple-press flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/40 text-xs font-semibold text-[#64D2FF]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {completedSetsCount === totalSetsCount && totalSetsCount > 0
                  ? "Poista kuittaukset"
                  : "Kuittaa kaikki sarjat"}
              </span>
            </button>
            <button
              type="button"
              onClick={resetToPlanned}
              title="Palauta oletuspainot ja -toistot"
              className="apple-press p-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-zinc-300 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Valmentajan muistutus kyseiselle treenille */}
        <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#007AFF]/12 via-[#0A84FF]/8 to-transparent border border-[#007AFF]/25 p-3.5 flex items-start gap-3">
          <Zap className="w-4 h-4 text-[#64D2FF] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-zinc-200">
            <span className="font-semibold text-white">
              {baseWorkout.subtitle} ({baseWorkout.structureLabel}):{" "}
            </span>
            {baseWorkout.coachNotes}
          </div>
        </div>
      </section>

      {/* Liikkeet ja sarjat: Yhden painalluksen kuittaus + lennosta muokkaus */}
      <section className="space-y-4">
        {sessionExercises.map((exercise, exIndex) => {
          const exDoneCount = exercise.sets.filter((s) => s.done).length;
          const allExDone =
            exercise.sets.length > 0 && exDoneCount === exercise.sets.length;
          const isEditingName = editingExerciseId === exercise.id;

          return (
            <div
              key={exercise.id}
              className={`apple-glass rounded-3xl p-4 sm:p-5 transition-all ${
                allExDone
                  ? "border-[#34C759]/45 bg-[#34C759]/[0.04]"
                  : "border-white/10"
              }`}
            >
              {/* Liikkeen otsikko & pikakuittaus */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#007AFF]/25 text-[#64D2FF] text-xs font-bold">
                      {exIndex + 1}
                    </span>

                    {isEditingName ? (
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) =>
                          updateExerciseName(exercise.id, e.target.value)
                        }
                        onBlur={() => setEditingExerciseId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditingExerciseId(null);
                        }}
                        autoFocus
                        className="rounded-lg bg-black/60 border border-[#0A84FF] px-2.5 py-1 text-base font-semibold text-white focus:outline-none"
                      />
                    ) : (
                      <h2 className="apple-title text-white flex items-center gap-2">
                        <span>{exercise.name}</span>
                        <button
                          type="button"
                          onClick={() => setEditingExerciseId(exercise.id)}
                          title="Vaihda liike tälle päivälle (ei muuta 8 vko pohjaa)"
                          className="apple-press p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </h2>
                    )}

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/8 text-zinc-200 border border-white/10">
                      Suunnitelma: {exercise.summary}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-zinc-300">
                      <Clock className="w-3.5 h-3.5 text-[#0A84FF]" />
                      Palautus: {exercise.restMinutes}
                    </span>
                    <span>• {exercise.cue}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAllExerciseSets(exercise.id)}
                  className={`apple-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border shrink-0 ${
                    allExDone
                      ? "bg-[#34C759] text-black border-[#34C759]"
                      : "bg-white/8 hover:bg-white/14 text-white border-white/15"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {allExDone
                      ? `Kaikki tehty (${exDoneCount}/${exercise.sets.length})`
                      : "Kuittaa liikkeen sarjat"}
                  </span>
                </button>
              </div>

              {/* Sarjarivit: valintaruutu + muokattavat toistot & kilot */}
              <div className="mt-3.5 space-y-2">
                {exercise.sets.map((set) => {
                  const isTop = set.type === "top";
                  const modified =
                    (set.actualReps && set.actualReps !== set.reps) ||
                    (set.actualWeightKg && set.actualWeightKg !== set.weightKg);

                  return (
                    <div
                      key={set.id}
                      className={`rounded-2xl p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        set.done
                          ? "bg-[#34C759]/12 border-[#34C759]/40"
                          : isTop
                          ? "bg-gradient-to-r from-[#FF3B30]/12 via-white/[0.03] to-transparent border-[#FF3B30]/30"
                          : "bg-white/[0.03] border-white/8"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={Boolean(set.done)}
                          aria-label={`Merkitse ${exercise.name} sarja ${set.setNumber} tehdyksi`}
                          onClick={() => toggleSetDone(exercise.id, set.id)}
                          className={`apple-press w-7 h-7 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                            set.done
                              ? "bg-[#34C759] border-[#34C759] text-black shadow-[0_0_12px_rgba(52,199,89,0.45)]"
                              : "bg-black/40 border-white/25 text-transparent hover:border-white/50"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                              Sarja {set.setNumber}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                isTop
                                  ? "bg-[#FF3B30]/20 text-[#FF6961] border border-[#FF3B30]/35"
                                  : "bg-white/8 text-zinc-300"
                              }`}
                            >
                              {set.label}
                            </span>
                            {set.targetRpe && (
                              <span className="text-[11px] text-zinc-400">
                                RPE {set.targetRpe}
                              </span>
                            )}
                            {modified && (
                              <span className="text-[11px] font-medium text-[#FFD60A] bg-[#FF9F0A]/15 px-2 py-0.5 rounded-md">
                                Muokattu tälle päivälle
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            Tavoite: {set.reps} × {set.weightKg} kg
                          </div>
                        </div>
                      </div>

                      {/* Muokattavat toistot ja paino (kg) */}
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-white/5 sm:border-0">
                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor={`${set.id}-reps`}
                            className="text-xs text-zinc-400"
                          >
                            Toistot:
                          </label>
                          <input
                            id={`${set.id}-reps`}
                            type="text"
                            value={set.actualReps ?? set.reps}
                            onChange={(e) =>
                              updateSetField(
                                exercise.id,
                                set.id,
                                "actualReps",
                                e.target.value
                              )
                            }
                            className="w-14 sm:w-16 rounded-xl bg-black/50 border border-white/15 px-2 py-1.5 text-center text-xs sm:text-sm font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                          />
                        </div>

                        <span className="text-zinc-500 font-bold">×</span>

                        <div className="flex items-center gap-1.5">
                          <label
                            htmlFor={`${set.id}-weight`}
                            className="text-xs text-zinc-400"
                          >
                            Kg:
                          </label>
                          <input
                            id={`${set.id}-weight`}
                            type="text"
                            value={set.actualWeightKg ?? set.weightKg}
                            onChange={(e) =>
                              updateSetField(
                                exercise.id,
                                set.id,
                                "actualWeightKg",
                                e.target.value
                              )
                            }
                            className="w-16 sm:w-20 rounded-xl bg-black/50 border border-white/15 px-2 py-1.5 text-center text-xs sm:text-sm font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSetDone(exercise.id, set.id)}
                          className={`apple-press px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 ${
                            set.done
                              ? "bg-[#34C759]/20 border-[#34C759]/50 text-[#30D158]"
                              : "bg-white/6 hover:bg-white/12 border-white/10 text-zinc-300"
                          }`}
                        >
                          {set.done ? "Tehty ✓" : "Tehty"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Treenin jälkeiset tuntemukset, puhesyöttö (fi-FI) ja tallennus */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6 space-y-4 border border-white/12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="apple-title text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0A84FF]" />
              <span>
                Treenin kuittaus & tuntemukset ({completedSetsCount}/
                {totalSetsCount} sarjaa valittu, {progressPercent} %)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Kerro tai sanele mikrofonilla, miten rauta liikkui ja miten happi
              sekä voimat riittivät. Tallennus ei muuta alkuperäistä 8 viikon
              pohjaohjelmaa.
            </p>
          </div>

          <VoiceInputButton
            onTranscript={(text) =>
              setFeelings((prev) => (prev ? `${prev} ${text}` : text))
            }
            label="Sanele treenifiilikset"
          />
        </div>

        {/* Pikamittarit: Happi, Voimat, Hermosto & Kesto */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <span className="block text-xs font-medium text-zinc-300 mb-1.5">
              Miten happi kulki? (1–5)
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setOxygenScore(n)}
                  className={`apple-press flex-1 py-1.5 rounded-lg text-xs font-bold border ${
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
              Tangon nopeus & voimat (1–5)
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergyScore(n)}
                  className={`apple-press flex-1 py-1.5 rounded-lg text-xs font-bold border ${
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
              htmlFor="workout-recovery-select"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Alaselän & hermoston tila
            </label>
            <select
              id="workout-recovery-select"
              value={recoveryStatus}
              onChange={(e) =>
                setRecoveryStatus(e.target.value as RecoveryStatus)
              }
              className="w-full rounded-lg bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
            >
              <option value="erinomainen">Erinomainen / terävä</option>
              <option value="normaali">Normaali</option>
              <option value="tukkoinen">Tukkoinen / alaselkä väsynyt</option>
              <option value="flunssainen">Flunssainen / nuha</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="workout-duration-input"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Treenin kesto (min)
            </label>
            <input
              id="workout-duration-input"
              type="number"
              min={10}
              max={240}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="workout-feelings-textarea"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Miten treeni meni / miten happi ja voimat riittivät?
          </label>
          <textarea
            id="workout-feelings-textarea"
            rows={2}
            value={feelings}
            onChange={(e) => setFeelings(e.target.value)}
            placeholder="Esim. 175 kg kolmonen tuli terävästi (1,5 toistoa varaa), 3×5×150 kg nousevalla nopeudella. Happi kulki hyvin..."
            className="w-full rounded-2xl bg-black/40 border border-white/15 p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#0A84FF] focus:outline-none"
          />
        </div>

        {justSavedToast && (
          <div
            role="status"
            className="rounded-2xl bg-[#34C759]/20 border border-[#34C759]/50 px-4 py-3 text-xs sm:text-sm font-semibold text-[#30D158] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{justSavedToast}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleCompleteWorkout(true)}
            className="apple-press inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/45 text-xs sm:text-sm font-semibold text-[#64D2FF]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tallenna & pyydä valmentajan palaute</span>
          </button>

          <button
            type="button"
            onClick={() => handleCompleteWorkout(false)}
            className="apple-press inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#0A84FF] hover:opacity-95 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#007AFF]/30"
          >
            <Dumbbell className="w-4 h-4" />
            <span>Kuittaa päivän voimatreeni tehdyksi</span>
          </button>
        </div>
      </section>
    </div>
  );
}
