"use client";

import { BASE_1RM } from "@/lib/programData";
import { ExercisePlan, PlannedSet, ProgramWorkout, WorkoutLog } from "@/lib/types";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Edit3,
  Flame,
  Play,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface FullProgramViewProps {
  programs: ProgramWorkout[];
  logs: WorkoutLog[];
  activeWorkoutId: string;
  recommendedWorkoutId: string;
  onSelectForToday: (workoutId: string) => void;
  onUpdateProgramWorkout: (workout: ProgramWorkout) => void;
}

function buildExerciseSummaryFromSets(sets: PlannedSet[]): string {
  if (!sets.length) return "";
  // Ryhmitellään peräkkäiset samanlaiset sarjat (esim. 1×3×170 kg + 3×5×150 kg)
  const groups: { count: number; reps: string; weightKg: string }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.reps === s.reps && last.weightKg === s.weightKg) {
      last.count += 1;
    } else {
      groups.push({ count: 1, reps: s.reps, weightKg: s.weightKg });
    }
  }
  return groups
    .map((g) => {
      const w = g.weightKg.trim();
      const hasUnit =
        w.toLowerCase().includes("kg") ||
        w.toLowerCase().includes("omapaino") ||
        w.toLowerCase().includes("rpe");
      return `${g.count}×${g.reps}${w ? `×${w}${hasUnit ? "" : " kg"}` : ""}`;
    })
    .join(" + ");
}

export function FullProgramView({
  programs,
  logs,
  activeWorkoutId,
  recommendedWorkoutId,
  onSelectForToday,
  onUpdateProgramWorkout,
}: FullProgramViewProps) {
  const [selectedPhase, setSelectedPhase] = useState<
    "all" | "base" | "peaking"
  >("all");

  const recommendedWorkout =
    programs.find((p) => p.id === recommendedWorkoutId) || programs[0];
  const currentCycleNum = recommendedWorkout?.cycleNumber || 1;

  const [expandedCycle, setExpandedCycle] = useState<number | null>(
    currentCycleNum
  );

  const openAndScrollToCycle = (cycleNum: number) => {
    setExpandedCycle(cycleNum);
    window.setTimeout(() => {
      document
        .getElementById(`program-cycle-${cycleNum}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [draftWorkout, setDraftWorkout] = useState<ProgramWorkout | null>(null);

  useEffect(() => {
    if (recommendedWorkout?.cycleNumber) {
      setExpandedCycle(recommendedWorkout.cycleNumber);
    }
  }, [recommendedWorkout?.cycleNumber]);

  const cycles = Array.from(new Set(programs.map((p) => p.cycleNumber))).sort(
    (a, b) => a - b
  );

  const filteredCycles = cycles.filter((c) => {
    if (selectedPhase === "base") return c <= 8;
    if (selectedPhase === "peaking") return c >= 9;
    return true;
  });

  const isWorkoutCompleted = (cycleNum: number, workoutNum: number) => {
    return logs.some(
      (l) =>
        l.category === "strength" &&
        l.cycleNumber === cycleNum &&
        l.workoutNumber === workoutNum
    );
  };

  // Lasketaan kokonaisetukäteisprogressio (8 viikon perusvoima = 24 treeniä, koko 12 viikkoa = 36 treeniä)
  const baseWorkouts = programs.filter((p) => p.cycleNumber <= 8);
  const completedBaseCount = baseWorkouts.filter((w) =>
    isWorkoutCompleted(w.cycleNumber, w.workoutNumber)
  ).length;
  const baseProgressPercent =
    baseWorkouts.length > 0
      ? Math.round((completedBaseCount / baseWorkouts.length) * 100)
      : 0;

  const startEditingWorkout = (workout: ProgramWorkout) => {
    const deepClone: ProgramWorkout = JSON.parse(JSON.stringify(workout));
    setDraftWorkout(deepClone);
    setEditingWorkoutId(workout.id);
  };

  const cancelEditingWorkout = () => {
    setEditingWorkoutId(null);
    setDraftWorkout(null);
  };

  const saveEditedWorkout = () => {
    if (!draftWorkout) return;
    onUpdateProgramWorkout(draftWorkout);
    setEditingWorkoutId(null);
    setDraftWorkout(null);
  };

  const updateDraftExerciseField = (
    exerciseId: string,
    field: keyof ExercisePlan,
    value: string
  ) => {
    setDraftWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, [field]: value } : ex
        ),
      };
    });
  };

  const updateDraftSetField = (
    exerciseId: string,
    setId: string,
    field: "reps" | "weightKg" | "label",
    value: string
  ) => {
    setDraftWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const nextSets = ex.sets.map((s) =>
            s.id === setId ? { ...s, [field]: value } : s
          );
          return {
            ...ex,
            sets: nextSets,
            summary: buildExerciseSummaryFromSets(nextSets),
          };
        }),
      };
    });
  };

  const addDraftSet = (exerciseId: string) => {
    setDraftWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSetNum = ex.sets.length + 1;
          const newSet: PlannedSet = {
            id: `${ex.id}-s${Date.now()}`,
            setNumber: newSetNum,
            type: "backoff",
            label: `Sarja ${newSetNum}`,
            reps: lastSet?.reps || "5",
            weightKg: lastSet?.weightKg || "100",
            targetRpe: lastSet?.targetRpe || "8.0",
          };
          const nextSets = [...ex.sets, newSet];
          return {
            ...ex,
            sets: nextSets,
            summary: buildExerciseSummaryFromSets(nextSets),
          };
        }),
      };
    });
  };

  const removeDraftSet = (exerciseId: string, setId: string) => {
    setDraftWorkout((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== exerciseId || ex.sets.length <= 1) return ex;
          const nextSets = ex.sets
            .filter((s) => s.id !== setId)
            .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return {
            ...ex,
            sets: nextSets,
            summary: buildExerciseSummaryFromSets(nextSets),
          };
        }),
      };
    });
  };

  return (
    <div className="min-w-0 space-y-6">
      {/* 1. HETI YLHÄÄLLÄ: VISUAALINEN ETENEMISMITTARI ("Missä kohtaa ohjelmaa ollaan menossa") */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6 border border-[#34C759]/35 bg-gradient-to-br from-[#34C759]/[0.08] via-transparent to-[#0A84FF]/[0.06]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 px-3 py-1 text-xs font-bold text-[#30D158]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Nyt menossa: Kierto {currentCycleNum} · Treeni{" "}
                {recommendedWorkout?.workoutNumber || 1}
              </span>
            </div>
            <h1 className="apple-display text-white pt-1">
              8 viikon ohjelman eteneminen
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300">
              Vihreät merkinnät näyttävät suoritetut treenit ja korostettu
              kohta näyttää suoraan, missä vaiheessa ohjelmaa olet nyt. Voit
              myös muokata minkä tahansa treenin sarjoja ja painoja etukäteen.
            </p>
          </div>

          <div className="rounded-2xl bg-black/45 border border-white/12 p-4 min-w-[240px]">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Perusvoimajakso (Kierrot 1–8)</span>
              <span className="text-[#30D158] font-bold">
                {completedBaseCount} / {baseWorkouts.length} treeniä (
                {baseProgressPercent} %)
              </span>
            </div>
            <div className="mt-2 h-3 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#34C759] to-[#30D158] transition-all duration-500 shadow-[0_0_12px_rgba(52,199,89,0.6)]"
                style={{ width: `${Math.max(baseProgressPercent, 6)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-zinc-400">
              Seuraava vuorossa:{" "}
              <strong className="text-white">
                {recommendedWorkout?.title}
              </strong>
            </div>
          </div>
        </div>

        {/* Visuaalinen kierrosten etenemiskartta (1–8 + 9–12) */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
            Klikkaa kiertoa avataksesi tai muokataksesi treenejä:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {cycles.map((cycleNum) => {
              const cWorkouts = programs.filter(
                (p) => p.cycleNumber === cycleNum
              );
              const doneCount = cWorkouts.filter((w) =>
                isWorkoutCompleted(w.cycleNumber, w.workoutNumber)
              ).length;
              const isAllDone =
                cWorkouts.length > 0 && doneCount === cWorkouts.length;
              const isCurrentCycle = cycleNum === currentCycleNum;

              return (
                <button
                  key={cycleNum}
                  type="button"
                  onClick={() => openAndScrollToCycle(cycleNum)}
                  className={`apple-press rounded-2xl p-3 text-left border transition-all ${
                    isAllDone
                      ? "bg-[#34C759]/20 border-[#34C759]/60 text-white shadow-[0_0_15px_rgba(52,199,89,0.2)]"
                      : isCurrentCycle
                      ? "bg-gradient-to-br from-[#34C759]/25 to-[#0A84FF]/25 border-[#30D158] ring-2 ring-[#34C759]/40 text-white"
                      : doneCount > 0
                      ? "bg-[#34C759]/10 border-[#34C759]/35 text-zinc-100"
                      : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold">
                      {cycleNum <= 8 ? `Kierto ${cycleNum}` : `Piikkaus ${cycleNum}`}
                    </span>
                    {isAllDone ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#34C759] text-black">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : isCurrentCycle ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#34C759] text-black text-[10px] font-extrabold uppercase">
                        Nyt
                      </span>
                    ) : null}
                  </div>

                  {/* 3 treenipallon rivi kierrolle */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    {cWorkouts.map((cw) => {
                      const wDone = isWorkoutCompleted(
                        cw.cycleNumber,
                        cw.workoutNumber
                      );
                      const wNext = cw.id === recommendedWorkoutId;
                      return (
                        <div
                          key={cw.id}
                          className={`flex-1 h-2 rounded-full transition-all ${
                            wDone
                              ? "bg-[#34C759] shadow-[0_0_6px_rgba(52,199,89,0.8)]"
                              : wNext
                              ? "bg-[#64D2FF] animate-pulse"
                              : "bg-white/15"
                          }`}
                          title={`${cw.title}: ${
                            wDone
                              ? "Tehty ✓"
                              : wNext
                              ? "Seuraavana vuorossa"
                              : "Tulossa"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-1.5 text-[11px] font-medium flex items-center justify-between">
                    <span
                      className={
                        doneCount > 0 ? "text-[#30D158] font-semibold" : ""
                      }
                    >
                      {doneCount}/{cWorkouts.length} tehty
                    </span>
                    {isCurrentCycle && !isAllDone && (
                      <span className="text-[#64D2FF] font-semibold">
                        Treeni {recommendedWorkout?.workoutNumber}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. KOKONAISKATSAUS KIERROITTAIN (Vihreät suoritusmerkinnät + missä mennään nyt) */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="apple-title text-white">
              Kokonaiskatsaus kierroittain (tarkat sarjat ja kilot)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Vihreä rivi tai merkintä = suoritettu. Klikkaa riviä avataksesi
              kierron treenit ja muokataksesi painoja.
            </p>
          </div>

          {/* Vaiheiden suodatin */}
          <div className="inline-flex rounded-2xl bg-black/50 p-1 border border-white/10 self-start">
            {[
              { id: "all", label: "Kaikki (1–12)" },
              { id: "base", label: "8 vk perusvoima (1–8)" },
              { id: "peaking", label: "Piikkaus (9–12)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setSelectedPhase(tab.id as "all" | "base" | "peaking")
                }
                className={`apple-press px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedPhase === tab.id
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left border-collapse min-w-[780px] text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-white/15 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="py-3 px-3">Kierto & tila</th>
              <th className="py-3 px-3">Rakenne</th>
              <th className="py-3 px-3">Maastaveto (Treeni 1)</th>
              <th className="py-3 px-3">Penkki (Treeni 1)</th>
              <th className="py-3 px-3">Lisäpainoleuat (Treeni 1)</th>
              <th className="py-3 px-3">Etukyykky (Treeni 2)</th>
              <th className="py-3 px-3">Volyymileuat (Treeni 2)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {filteredCycles.map((cycleNum) => {
              const w1 = programs.find(
                (p) => p.cycleNumber === cycleNum && p.workoutNumber === 1
              );
              const w2 = programs.find(
                (p) => p.cycleNumber === cycleNum && p.workoutNumber === 2
              );
              const w3 = programs.find(
                (p) => p.cycleNumber === cycleNum && p.workoutNumber === 3
              );
              if (!w1 || !w2) return null;

              const w1Done = isWorkoutCompleted(cycleNum, 1);
              const w2Done = isWorkoutCompleted(cycleNum, 2);
              const w3Done = w3 ? isWorkoutCompleted(cycleNum, 3) : false;
              const allCycleDone = w1Done && w2Done && w3Done;
              const isCurrentCycle = cycleNum === currentCycleNum;

              const dl = w1.exercises.find((e) => e.code === "DL")?.summary;
              const b = w1.exercises.find((e) => e.code === "B")?.summary;
              const l = w1.exercises.find((e) => e.code === "L")?.summary;
              const s = w2.exercises.find((e) => e.code === "S")?.summary;
              const vl = w2.exercises.find((e) => e.code === "VOL_L")?.summary;
              const isDeload =
                cycleNum === 4 || cycleNum === 8 || cycleNum === 11;

              return (
                <tr
                  key={cycleNum}
                  onClick={() => openAndScrollToCycle(cycleNum)}
                  className={`cursor-pointer transition-colors ${
                    allCycleDone
                      ? "bg-[#34C759]/15 hover:bg-[#34C759]/22"
                      : isCurrentCycle
                      ? "bg-gradient-to-r from-[#34C759]/18 via-[#0A84FF]/12 to-transparent hover:bg-[#34C759]/22"
                      : isDeload
                      ? "bg-[#32ADE6]/[0.05] hover:bg-white/[0.06]"
                      : "hover:bg-white/[0.06]"
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>
                        {cycleNum <= 8
                          ? `Kierto ${cycleNum}`
                          : `Vko ${cycleNum}`}
                      </span>
                      {allCycleDone ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34C759] text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Valmis
                        </span>
                      ) : isCurrentCycle ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#34C759]/30 text-[#30D158] border border-[#34C759]/60">
                          Menossa ({Number(w1Done) + Number(w2Done) + Number(w3Done)}/3)
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-zinc-300 font-medium">
                    {w1.structureLabel}
                  </td>
                  <td
                    className={`py-3 px-3 font-semibold ${
                      w1Done ? "text-[#30D158]" : "text-[#64D2FF]"
                    }`}
                  >
                    {w1Done ? `✓ ${dl}` : dl}
                  </td>
                  <td
                    className={`py-3 px-3 font-semibold ${
                      w1Done ? "text-[#30D158]" : "text-white"
                    }`}
                  >
                    {w1Done ? `✓ ${b}` : b}
                  </td>
                  <td
                    className={`py-3 px-3 font-semibold ${
                      w1Done ? "text-[#30D158]" : "text-zinc-200"
                    }`}
                  >
                    {w1Done ? `✓ ${l}` : l}
                  </td>
                  <td
                    className={`py-3 px-3 font-semibold ${
                      w2Done ? "text-[#30D158]" : "text-[#64D2FF]"
                    }`}
                  >
                    {w2Done ? `✓ ${s}` : s}
                  </td>
                  <td
                    className={`py-3 px-3 ${
                      w2Done
                        ? "text-[#30D158] font-semibold"
                        : "text-zinc-300"
                    }`}
                  >
                    {w2Done ? `✓ ${vl}` : vl}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 3. TARKAT TREENIKORTIT & SUORA OHJELMAN MUOKKAUS */}
      <section className="space-y-3">
        {filteredCycles.map((cycleNum) => {
          const cycleWorkouts = programs.filter(
            (p) => p.cycleNumber === cycleNum
          );
          const isOpen = expandedCycle === cycleNum;
          const first = cycleWorkouts[0];
          const completedInCycle = cycleWorkouts.filter((w) =>
            isWorkoutCompleted(w.cycleNumber, w.workoutNumber)
          ).length;
          const isCurrentCycle = cycleNum === currentCycleNum;
          const allCycleDone =
            cycleWorkouts.length > 0 &&
            completedInCycle === cycleWorkouts.length;

          return (
            <div
              key={cycleNum}
              id={`program-cycle-${cycleNum}`}
              className={`apple-glass scroll-mt-24 rounded-3xl overflow-hidden border transition-all ${
                allCycleDone
                  ? "border-[#34C759]/50"
                  : isCurrentCycle
                  ? "border-[#34C759]/60 ring-1 ring-[#34C759]/30"
                  : "border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedCycle(isOpen ? null : cycleNum)}
                className="apple-press w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      allCycleDone
                        ? "bg-[#34C759] text-black"
                        : isCurrentCycle
                        ? "bg-[#34C759]/25 text-[#30D158] border border-[#34C759]/50"
                        : cycleNum <= 8
                        ? "bg-[#007AFF]/20 text-[#64D2FF] border border-[#007AFF]/35"
                        : "bg-[#FF3B30]/20 text-[#FF6961] border border-[#FF3B30]/35"
                    }`}
                  >
                    {cycleNum <= 8
                      ? `Perusvoima · Kierto ${cycleNum}`
                      : `Piikkaus · Viikko ${cycleNum}`}
                  </span>
                  {isCurrentCycle && !allCycleDone && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#34C759] text-black">
                      Nyt menossa
                    </span>
                  )}
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {first?.structureLabel}
                  </h3>
                  <span
                    className={`text-xs font-semibold ${
                      completedInCycle > 0 ? "text-[#30D158]" : "text-zinc-400"
                    }`}
                  >
                    ({completedInCycle}/{cycleWorkouts.length} treeniä tehty)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-xs hidden sm:inline">
                    {isOpen ? "Piilota treenipäivät" : "Näytä & muokkaa treenejä"}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="p-4 sm:p-5 pt-0 border-t border-white/10 grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  {cycleWorkouts.map((workout) => {
                    const done = isWorkoutCompleted(
                      workout.cycleNumber,
                      workout.workoutNumber
                    );
                    const isRecommended = workout.id === recommendedWorkoutId;
                    const isActive = workout.id === activeWorkoutId;
                    const isEditingThis =
                      editingWorkoutId === workout.id && draftWorkout !== null;
                    const displayWorkout = isEditingThis
                      ? draftWorkout
                      : workout;

                    return (
                      <div
                        key={workout.id}
                        className={`apple-card rounded-2xl p-4 flex flex-col justify-between transition-all ${
                          isEditingThis
                            ? "border-[#FFD60A]/70 ring-2 ring-[#FFD60A]/30 lg:col-span-3"
                            : done
                            ? "border-[#34C759]/55 bg-[#34C759]/[0.05]"
                            : isRecommended
                            ? "border-[#0A84FF]/65 ring-1 ring-[#0A84FF]/35"
                            : ""
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-[#64D2FF]">
                                  Treeni {displayWorkout.workoutNumber}
                                </span>
                                {done && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#34C759] text-black">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    Tehty
                                  </span>
                                )}
                                {isRecommended && !done && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0A84FF] text-white">
                                    Seuraavana vuorossa
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                                {displayWorkout.subtitle}
                              </h4>
                            </div>

                            {!isEditingThis ? (
                              <button
                                type="button"
                                onClick={() => startEditingWorkout(workout)}
                                className="apple-press shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/12 text-xs font-semibold text-zinc-200"
                                title="Muokkaa tämän treenin liikkeitä, sarjoja tai painoja valmiiksi ohjelmaan"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#64D2FF]" />
                                <span>Muokkaa</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={saveEditedWorkout}
                                  className="apple-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#34C759] text-black text-xs font-bold shadow-sm"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Tallenna ohjelmaan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingWorkout}
                                  className="apple-press inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 text-zinc-300 text-xs font-semibold"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Peruuta</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-zinc-400 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>
                              Lepo treenin jälkeen:{" "}
                              {displayWorkout.restDaysAfterMin}–
                              {displayWorkout.restDaysAfterMax} täyttä
                              välipäivää
                            </span>
                          </div>

                          {/* JOS MUOKKAUSTILA ON PÄÄLLÄ: Näytetään täysi sarja- ja painoeditori */}
                          {isEditingThis ? (
                            <div className="space-y-4 pt-2 border-t border-white/10">
                              <div className="rounded-xl bg-[#FFD60A]/10 border border-[#FFD60A]/30 px-3.5 py-2 text-xs text-[#FFD60A]">
                                Muokkaat nyt treeniä{" "}
                                <strong>{displayWorkout.title}</strong>.
                                Muutokset tallentuvat suoraan 8 viikon
                                ohjelmaasi ja Supabaseen.
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {displayWorkout.exercises.map((ex) => (
                                  <div
                                    key={ex.id}
                                    className="rounded-2xl bg-black/45 border border-white/12 p-3.5 space-y-3"
                                  >
                                    <div className="space-y-2">
                                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                        Liikkeen nimi
                                      </label>
                                      <input
                                        type="text"
                                        value={ex.name}
                                        onChange={(e) =>
                                          updateDraftExerciseField(
                                            ex.id,
                                            "name",
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-1.5 text-xs font-bold text-white focus:border-[#0A84FF] focus:outline-none"
                                      />

                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <label className="block text-[10px] text-zinc-400">
                                            Yhteenveto
                                          </label>
                                          <input
                                            type="text"
                                            value={ex.summary}
                                            onChange={(e) =>
                                              updateDraftExerciseField(
                                                ex.id,
                                                "summary",
                                                e.target.value
                                              )
                                            }
                                            className="w-full rounded-lg bg-black/60 border border-white/12 px-2.5 py-1 text-xs font-semibold text-[#64D2FF] focus:border-[#0A84FF] focus:outline-none"
                                          />
                                        </div>
                                        <div className="w-24">
                                          <label className="block text-[10px] text-zinc-400">
                                            Palautus
                                          </label>
                                          <input
                                            type="text"
                                            value={ex.restMinutes}
                                            onChange={(e) =>
                                              updateDraftExerciseField(
                                                ex.id,
                                                "restMinutes",
                                                e.target.value
                                              )
                                            }
                                            className="w-full rounded-lg bg-black/60 border border-white/12 px-2 py-1 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Sarjojen muokkaus */}
                                    <div className="space-y-1.5">
                                      <div className="text-[11px] font-semibold text-zinc-400">
                                        Sarjat (toistot × paino kg):
                                      </div>
                                      {ex.sets.map((s) => (
                                        <div
                                          key={s.id}
                                          className="flex items-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/8 p-1.5"
                                        >
                                          <span className="text-[11px] font-bold text-zinc-400 w-7 text-center">
                                            #{s.setNumber}
                                          </span>
                                          <input
                                            type="text"
                                            value={s.reps}
                                            onChange={(e) =>
                                              updateDraftSetField(
                                                ex.id,
                                                s.id,
                                                "reps",
                                                e.target.value
                                              )
                                            }
                                            aria-label="Toistot"
                                            className="w-12 rounded-lg bg-black/60 border border-white/15 px-1.5 py-1 text-center text-xs font-bold text-white"
                                          />
                                          <span className="text-xs text-zinc-500">
                                            ×
                                          </span>
                                          <input
                                            type="text"
                                            value={s.weightKg}
                                            onChange={(e) =>
                                              updateDraftSetField(
                                                ex.id,
                                                s.id,
                                                "weightKg",
                                                e.target.value
                                              )
                                            }
                                            aria-label="Paino kg"
                                            className="flex-1 min-w-0 rounded-lg bg-black/60 border border-white/15 px-2 py-1 text-center text-xs font-bold text-[#30D158]"
                                          />
                                          <span className="text-[11px] text-zinc-400">
                                            kg
                                          </span>
                                          {ex.sets.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeDraftSet(ex.id, s.id)
                                              }
                                              className="p-1 text-zinc-500 hover:text-[#FF453A]"
                                              title="Poista sarja"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}

                                      <button
                                        type="button"
                                        onClick={() => addDraftSet(ex.id)}
                                        className="apple-press w-full py-1.5 rounded-xl border border-dashed border-white/20 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-white/40 inline-flex items-center justify-center gap-1"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Lisää sarja</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={cancelEditingWorkout}
                                  className="apple-press px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-zinc-200"
                                >
                                  Peruuta
                                </button>
                                <button
                                  type="button"
                                  onClick={saveEditedWorkout}
                                  className="apple-press inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#34C759] text-black text-xs font-bold shadow-md"
                                >
                                  <Save className="w-4 h-4" />
                                  <span>Tallenna muutokset ohjelmaan</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-1">
                              {displayWorkout.exercises.map((ex) => (
                                <div
                                  key={ex.id}
                                  className="rounded-xl bg-black/35 border border-white/8 p-2.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-white">
                                      {ex.name}
                                    </span>
                                    <span className="text-[11px] text-zinc-400">
                                      Palautus {ex.restMinutes}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs font-semibold mt-0.5 ${
                                      done ? "text-[#30D158]" : "text-[#64D2FF]"
                                    }`}
                                  >
                                    {ex.summary}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {!isEditingThis && (
                          <button
                            type="button"
                            onClick={() => onSelectForToday(workout.id)}
                            className={`apple-press mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 border ${
                              isActive
                                ? "bg-[#007AFF] text-white border-[#007AFF]"
                                : "bg-white/8 hover:bg-white/14 text-white border-white/12"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Dumbbell className="w-3.5 h-3.5" />
                                <span>Valittuna Tänään-näkymässä</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Avaa Tänään-näkymään</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 4. 1RM-LASKENTAPOHJAT & FYSIIKKASÄÄNNÖT */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: "Maastaveto (DL)",
              current: `${BASE_1RM.deadlift} kg`,
              target: BASE_1RM.targetDeadlift,
              note: "Treeni 1 pääliike",
            },
            {
              name: "Penkkipunnerrus (B)",
              current: `${BASE_1RM.bench} kg`,
              target: BASE_1RM.targetBench,
              note: "Treeni 1 + Treeni 3 nopeus",
            },
            {
              name: "Etukyykky (S)",
              current: `${BASE_1RM.frontSquat} kg`,
              target: BASE_1RM.targetFrontSquat,
              note: "Treeni 2 pääliike",
            },
            {
              name: "Lisäpainoleuat (L)",
              current: `+${BASE_1RM.weightedPullup} kg`,
              target: BASE_1RM.targetWeightedPullup,
              note: "Treeni 1 maksimi + Treeni 2 volyymi",
            },
          ].map((lift) => (
            <div
              key={lift.name}
              className="apple-card rounded-2xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-400">
                  {lift.name}
                </span>
                <TrendingUp className="w-4 h-4 text-[#30D158]" />
              </div>
              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="text-lg sm:text-xl font-bold text-white">
                  {lift.current}
                </span>
                <span className="text-xs text-zinc-400">→</span>
                <span className="text-sm sm:text-base font-bold text-[#30D158]">
                  {lift.target}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1">
                {lift.note}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#FF9F0A] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Palautumissääntö 1:</strong>{" "}
              Raskaan maastavetopäivän (Treeni 1) jälkeen pidetään poikkeuksetta{" "}
              <strong>2–3 täyttä lepopäivää</strong> ennen etukyykkyä.
            </span>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3 flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Tekninen reservi:</strong> Jätä
              pääsarjoihin aina 1–1,5 toistoa varaa (RPE 8.5–9), jotta
              keskushermosto ei ajaudu ylikuntoon.
            </span>
          </div>
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3 flex items-start gap-2.5">
            <Award className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Kiertojärjestys:</strong> Treeni 1
              (A) → 2–3 lepoa → Treeni 2 (B) → 1–2 lepoa → Treeni 3 (C) → 2
              lepoa.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
