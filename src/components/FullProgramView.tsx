"use client";

import { BASE_1RM } from "@/lib/programData";
import { ProgramWorkout, WorkoutLog } from "@/lib/types";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Flame,
  Play,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import React, { useState } from "react";

interface FullProgramViewProps {
  programs: ProgramWorkout[];
  logs: WorkoutLog[];
  activeWorkoutId: string;
  recommendedWorkoutId: string;
  onSelectForToday: (workoutId: string) => void;
}

export function FullProgramView({
  programs,
  logs,
  activeWorkoutId,
  recommendedWorkoutId,
  onSelectForToday,
}: FullProgramViewProps) {
  const [selectedPhase, setSelectedPhase] = useState<"all" | "base" | "peaking">(
    "all"
  );
  const [expandedCycle, setExpandedCycle] = useState<number | null>(1);

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

  return (
    <div className="space-y-6">
      {/* Yläkortti: 1RM-laskentapohjat & 12 viikon ennätystavoitteet */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF]">
              Ydinohjelma · Liukuva 3 treenin mikrosykli (10–12 pv / kierto)
            </span>
            <h1 className="apple-display text-white mt-1">
              8 viikon voimaohjelma & 4 viikon piikkaus
            </h1>
            <p className="text-sm text-zinc-300 mt-1 max-w-3xl">
              Ohjelma perustuu PAP-kontrastiaaltoihin (raskas 1–3 toiston heräte
              + 3 × 5 back-off), tasaisiin 4 × 4 -perusvoimakiertoihin ja joka
              neljännen kierron hermostolliseen kevennykseen. Valmentaja ei
              koskaan muuta tätä pohjaohjelmaa ilman nimenomaista hyväksyntääsi.
            </p>
          </div>

          {/* Vaiheiden suodatin */}
          <div className="inline-flex rounded-2xl bg-black/50 p-1 border border-white/10 self-start">
            {[
              { id: "all", label: "Kaikki (1–12)" },
              { id: "base", label: "8 vko perusvoima (1–8)" },
              { id: "peaking", label: "Piikkaus (9–12)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setSelectedPhase(tab.id as "all" | "base" | "peaking")
                }
                className={`apple-press px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
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

        {/* 1RM Laskentapohjat vs. Tavoitteet */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
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
              note: "Treeni 2 pääliike (eri päivänä kuin DL)",
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

        {/* Fysiologiset kultaiset säännöt */}
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

      {/* Kokonaistaulukko (Kierrot 1–8) */}
      <section className="apple-glass rounded-3xl p-5 sm:p-6 overflow-x-auto">
        <h2 className="apple-title text-white mb-3">
          Kokonaiskatsaus kierroittain (tarkat sarjat ja kilot)
        </h2>
        <table className="w-full text-left border-collapse min-w-[780px] text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-white/15 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="py-3 px-3">Kierto</th>
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
              if (!w1 || !w2) return null;

              const dl = w1.exercises.find((e) => e.code === "DL")?.summary;
              const b = w1.exercises.find((e) => e.code === "B")?.summary;
              const l = w1.exercises.find((e) => e.code === "L")?.summary;
              const s = w2.exercises.find((e) => e.code === "S")?.summary;
              const vl = w2.exercises.find((e) => e.code === "VOL_L")?.summary;
              const isDeload = cycleNum === 4 || cycleNum === 8 || cycleNum === 11;

              return (
                <tr
                  key={cycleNum}
                  onClick={() =>
                    setExpandedCycle(
                      expandedCycle === cycleNum ? null : cycleNum
                    )
                  }
                  className={`cursor-pointer transition-colors hover:bg-white/[0.06] ${
                    isDeload ? "bg-[#32ADE6]/[0.05]" : ""
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                    {cycleNum <= 8 ? `Kierto ${cycleNum}` : `Vko ${cycleNum}`}
                  </td>
                  <td className="py-3 px-3 text-zinc-300 font-medium">
                    {w1.structureLabel}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#64D2FF]">
                    {dl}
                  </td>
                  <td className="py-3 px-3 font-semibold text-white">{b}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-200">{l}</td>
                  <td className="py-3 px-3 font-semibold text-[#30D158]">
                    {s}
                  </td>
                  <td className="py-3 px-3 text-zinc-300">{vl}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Tarkat treenikortit kierroittain */}
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

          return (
            <div
              key={cycleNum}
              className="apple-glass rounded-3xl overflow-hidden border border-white/10"
            >
              <button
                type="button"
                onClick={() => setExpandedCycle(isOpen ? null : cycleNum)}
                className="apple-press w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      cycleNum <= 8
                        ? "bg-[#007AFF]/20 text-[#64D2FF] border border-[#007AFF]/35"
                        : "bg-[#FF3B30]/20 text-[#FF6961] border border-[#FF3B30]/35"
                    }`}
                  >
                    {cycleNum <= 8
                      ? `Perusvoima · Kierto ${cycleNum}`
                      : `Piikkaus · Viikko ${cycleNum}`}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {first?.structureLabel}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    ({completedInCycle}/3 treeniä suoritettu)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-xs hidden sm:inline">
                    {isOpen ? "Piilota treenipäivät" : "Näytä 3 treenipäivää"}
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

                    return (
                      <div
                        key={workout.id}
                        className={`apple-card rounded-2xl p-4 flex flex-col justify-between ${
                          isRecommended
                            ? "border-[#0A84FF]/60 ring-1 ring-[#0A84FF]/30"
                            : done
                            ? "border-[#34C759]/40"
                            : ""
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-[#64D2FF]">
                                  Treeni {workout.workoutNumber}
                                </span>
                                {isRecommended && (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0A84FF]/25 text-[#64D2FF]">
                                    Vuorossa nyt
                                  </span>
                                )}
                                {done && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/20 text-[#30D158]">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Tehty
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-white mt-1">
                                {workout.subtitle}
                              </h4>
                            </div>
                          </div>

                          <div className="text-xs text-zinc-400 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>
                              Lepo treenin jälkeen: {workout.restDaysAfterMin}–
                              {workout.restDaysAfterMax} täyttä välipäivää
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {workout.exercises.map((ex) => (
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
                                <div className="text-xs font-semibold text-[#64D2FF] mt-0.5">
                                  {ex.summary}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

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
                              <span>Valittuna Päivän treeni -näkymässä</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Avaa Päivän treeni -näkymään</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
