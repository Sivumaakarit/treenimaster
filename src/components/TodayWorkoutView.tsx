"use client";

import { InstantCoachFeedback } from "@/lib/coachIntelligence";
import { NextWorkoutRecommendation } from "@/lib/storage";
import { SPORT_CATEGORIES } from "@/lib/programData";
import {
  cleanSpokenToSelkosuomi,
  extractDistanceKmFromLog,
  parseSpokenFeelingsToSelkosuomi,
} from "@/lib/workoutParser";
import {
  ExercisePlan,
  ProgramWorkout,
  RecoveryStatus,
  SportCategory,
  WorkoutLog,
} from "@/lib/types";
import {
  Activity,
  Award,
  Bot,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Edit3,
  Footprints,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { SportCharacterAvatar } from "./SportCharacterAvatar";
import { VoiceInputButton } from "./VoiceInputButton";
import { WorkoutLogEditor } from "./WorkoutLogEditor";

const STRENGTH_DEVIATION_CHIPS = [
  "Suunnitelman mukaan ✓",
  "Painoi / hieman tukkoinen",
  "Alaselkä / nivelet varovasti",
  "Aikapula – tiivistetty treeni",
  "Huonot unet / palautuminen vajaa",
];

const SKIP_DAY_REASONS = [
  "Työkiireet / aikapula",
  "Väsymys / huonot unet",
  "Alaselkä tai jalat vielä palautumassa",
  "Flunssainen olo / nuha",
  "Suunniteltu lepopäivä",
];

interface TodayWorkoutViewProps {
  todayISO: string;
  logs: WorkoutLog[];
  recommendation: NextWorkoutRecommendation;
  programs: ProgramWorkout[];
  activeWorkoutId: string;
  instantFeedback: InstantCoachFeedback | null;
  onDismissFeedback: () => void;
  onSelectWorkoutId: (id: string) => void;
  onSaveStrengthLog: (
    log: WorkoutLog,
    askCoachAfter: boolean,
    deviationReason?: string
  ) => void;
  onDeleteLog?: (logId: string) => void;
  onOpenOtherWorkoutModal: () => void;
  onNavigateToProgram: () => void;
}

function formatFinnishShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const weekday = new Intl.DateTimeFormat("fi-FI", {
    weekday: "long",
  }).format(dt);
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${d}.${m}.`;
}

export function TodayWorkoutView({
  todayISO,
  logs,
  recommendation,
  programs,
  activeWorkoutId,
  instantFeedback,
  onDismissFeedback,
  onSelectWorkoutId,
  onSaveStrengthLog,
  onDeleteLog,
  onOpenOtherWorkoutModal,
  onNavigateToProgram,
}: TodayWorkoutViewProps) {
  const baseWorkout =
    programs.find((p) => p.id === activeWorkoutId) ||
    recommendation.nextWorkout;

  const todaysLogs = logs.filter((l) => l.performedDate === todayISO);

  const [sessionExercises, setSessionExercises] = useState<ExercisePlan[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null
  );
  const [feelings, setFeelings] = useState("");
  const [deviationReason, setDeviationReason] = useState<string>("");
  const [oxygenScore, setOxygenScore] = useState<number | null>(null);
  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [recoveryStatus, setRecoveryStatus] =
    useState<RecoveryStatus>("normaali");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [justSavedToast, setJustSavedToast] = useState<string | null>(null);
  const [showSkipReasonBox, setShowSkipReasonBox] = useState<boolean>(false);
  const [skipReasonText, setSkipReasonText] = useState<string>(
    "Työkiireet / aikapula"
  );
  const [selkosuomiPolishing, setSelkosuomiPolishing] =
    useState<boolean>(false);
  const [selkosuomiBadge, setSelkosuomiBadge] = useState<string | null>(null);

  // Päivän kirjatun suorituksen muokkaustila
  const [editingLoggedId, setEditingLoggedId] = useState<string | null>(null);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState<boolean>(false);
  const feedbackSectionRef = useRef<HTMLElement | null>(null);
  const lastScrolledFeedbackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      instantFeedback?.id &&
      instantFeedback.id !== lastScrolledFeedbackIdRef.current
    ) {
      lastScrolledFeedbackIdRef.current = instantFeedback.id;
      const timer = window.setTimeout(() => {
        feedbackSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [instantFeedback?.id]);

  const handleVoiceFeelingsDictation = (rawSpeech: string) => {
    const combinedRaw = feelings ? `${feelings} ${rawSpeech}` : rawSpeech;
    const localParsed = parseSpokenFeelingsToSelkosuomi(
      combinedRaw,
      "strength"
    );

    // Päivitetään heti selkosuomeksi + asetetaan Happi, Voimat, Palautuminen ja Poikkeama automaattisesti!
    setFeelings(localParsed.selkosuomiText);
    setOxygenScore(localParsed.oxygenScore);
    setEnergyScore(localParsed.energyScore);
    setRecoveryStatus(localParsed.recoveryStatus);
    setDeviationReason(localParsed.suggestedDeviationChip);
    setSelkosuomiBadge("Muotoiltu selkosuomeksi Supabase-tallennukseen ✓");

    // Viimeistellään vielä taustalla tekoälyllä täydelliseksi selkosuomeksi
    setSelkosuomiPolishing(true);
    void fetch("/api/selkosuomi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: combinedRaw, mode: "strength" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.selkosuomiText) {
          setFeelings(data.selkosuomiText);
          if (data.oxygenScore) setOxygenScore(data.oxygenScore);
          if (data.energyScore) setEnergyScore(data.energyScore);
        }
      })
      .catch(() => {
        // Pidetään välitön selkosuomi-muunnos
      })
      .finally(() => {
        setSelkosuomiPolishing(false);
      });
  };

  const handleVoiceSkipReasonDictation = (rawSpeech: string) => {
    const localParsed = parseSpokenFeelingsToSelkosuomi(rawSpeech, "skip");
    setSkipReasonText(localParsed.selkosuomiText);
  };

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
    setDurationMinutes("");
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
    const hasReasonNote =
      deviationReason && deviationReason !== "Suunnitelman mukaan ✓";
    const cleanedFeelings = cleanSpokenToSelkosuomi(feelings).trim();
    const finalFeelings = cleanedFeelings
      ? hasReasonNote
        ? `[Huomio: ${deviationReason}] ${cleanedFeelings}`
        : cleanedFeelings
      : hasReasonNote
        ? `[Huomio: ${deviationReason}]`
        : "";

    const newLog: WorkoutLog = {
      id: `log-strength-${Date.now()}`,
      performedDate: todayISO,
      category: "strength",
      title: `${baseWorkout.title} (${baseWorkout.structureLabel})`,
      cycleNumber: baseWorkout.cycleNumber,
      workoutNumber: baseWorkout.workoutNumber,
      programId: baseWorkout.id,
      durationMinutes: Number.isNaN(dur) ? 0 : dur,
      rpe: baseWorkout.cycleNumber === 4 || baseWorkout.cycleNumber === 8 ? 6.0 : 8.5,
      exercises: normalizedExercises,
      feelings: finalFeelings,
      oxygenScore: oxygenScore ?? 4,
      energyScore: energyScore ?? 4,
      recoveryStatus,
      source: "workout_view",
      createdAt: new Date().toISOString(),
    };

    onSaveStrengthLog(
      newLog,
      askCoachAfter,
      deviationReason || "Suunnitelman mukaan ✓"
    );
    setJustSavedToast(
      `${baseWorkout.title} tallennettu Supabaseen ja kalenteriin!`
    );
    setFeelings("");
    setOxygenScore(null);
    setEnergyScore(null);
    setDeviationReason("");
    setTimeout(() => setJustSavedToast(null), 5000);
  };

  const isRecommendedWorkout =
    baseWorkout.id === recommendation.nextWorkout.id;

  return (
    <div className="min-w-0 space-y-4">
      {/* Päivän selkeä otsikko kortin yläpuolella */}
      <div className="px-1">
        <h2 className="apple-display text-white">Tänään</h2>
      </div>

      {/* KORTTI 1: TÄNÄÄN – Päivän tilanne, mahdolliset tänään tehdyt treenit/lenkit & lepopäivän kirjaus */}
      <section className="apple-glass min-w-0 overflow-hidden rounded-3xl p-4 sm:p-5 border border-white/12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm sm:text-base font-bold border whitespace-normal leading-snug ${recommendation.readinessState === "ready"
                ? "bg-[#34C759]/15 text-[#30D158] border-[#34C759]/35"
                : recommendation.readinessState === "completed_today"
                  ? "bg-[#0A84FF]/15 text-[#64D2FF] border-[#0A84FF]/35"
                  : "bg-[#FF9F0A]/15 text-[#FFD60A] border-[#FF9F0A]/35"
                }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{recommendation.readinessHeadline}</span>
            </span>
          </div>

          {recommendation.readinessState === "ready" && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {recommendation.suggestDeloadAfterBreak &&
                recommendation.deloadWorkoutId &&
                activeWorkoutId !== recommendation.deloadWorkoutId && (
                  <button
                    type="button"
                    onClick={() =>
                      onSelectWorkoutId(recommendation.deloadWorkoutId!)
                    }
                    className="apple-press inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF9F0A]/20 hover:bg-[#FF9F0A]/30 border border-[#FF9F0A]/45 text-xs font-semibold text-[#FFD60A] transition"
                  >
                    <span>Ota kevennetty herättely (Kierto 4)</span>
                  </button>
                )}
              <button
                type="button"
                onClick={() => setShowSkipReasonBox((v) => !v)}
                className="apple-press inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition"
              >
                <span>☕ Passaan tänään</span>
              </button>
            </div>
          )}
        </div>

        {/* Pikapaneeli: Miksi en treenannut tänään / miksi siirrän treeniä? */}
        {showSkipReasonBox && (
          <div className="mt-3 rounded-2xl bg-black/45 border border-[#FF9F0A]/35 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#FFD60A]">
                Vapaapäivä tekee hyvää! Nappaa halutessasi syy talteen:
              </span>
              <button
                type="button"
                onClick={() => setShowSkipReasonBox(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SKIP_DAY_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSkipReasonText(reason)}
                  className={`apple-press px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${skipReasonText === reason
                    ? "bg-[#FF9F0A]/25 border-[#FF9F0A] text-[#FFD60A]"
                    : "bg-white/[0.04] border-white/10 text-zinc-300"
                    }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={skipReasonText}
                onChange={(e) => setSkipReasonText(e.target.value)}
                placeholder="Sanele tai kirjoita syy..."
                className="flex-1 rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
              />
              <VoiceInputButton
                onTranscript={handleVoiceSkipReasonDictation}
                label="Sanele syy"
              />
              <button
                type="button"
                onClick={() => {
                  const cleanSkipReason =
                    cleanSpokenToSelkosuomi(skipReasonText) || skipReasonText;
                  const restLog: WorkoutLog = {
                    id: `log-rest-${Date.now()}`,
                    performedDate: todayISO,
                    category: "rest",
                    title: `Lepopäivä / siirto · ${cleanSkipReason}`,
                    cycleNumber: null,
                    workoutNumber: null,
                    programId: null,
                    durationMinutes: 0,
                    rpe: 1,
                    exercises: [],
                    feelings: `[Huomio: ${cleanSkipReason}] Treeni siirretty tai pidetty palautumispäivä.`,
                    oxygenScore: 4,
                    energyScore: 4,
                    recoveryStatus: cleanSkipReason
                      .toLowerCase()
                      .includes("flunssa")
                      ? "flunssainen"
                      : cleanSkipReason.toLowerCase().includes("väsymys") ||
                        cleanSkipReason.toLowerCase().includes("alaselkä")
                        ? "tukkoinen"
                        : "normaali",
                    source: "workout_view",
                    createdAt: new Date().toISOString(),
                  };
                  onSaveStrengthLog(restLog, false, cleanSkipReason);
                  setShowSkipReasonBox(false);
                }}
                className="apple-press px-4 py-2 rounded-xl bg-[#34C759] text-black text-xs font-bold shrink-0"
              >
                Tallenna syy & lepopäivä
              </button>
            </div>
          </div>
        )}

        {/* VÄLIPÄIVÄN ÄLYKÄS SUOSITUS: Jos tänään ei suositella punttisarjoja, kerrotaan selkeästi mitä tänään kannattaa tehdä! */}
        {recommendation.readinessState === "rest_recommended" &&
          todaysLogs.length === 0 && (
            <div className="mt-3.5 rounded-2xl border border-[#34C759]/40 bg-gradient-to-r from-[#34C759]/12 via-[#32ADE6]/10 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 text-sm">
                <div className="font-bold text-[#30D158] flex items-center gap-1.5">
                  <Footprints className="w-4 h-4 shrink-0" />
                  <span>
                    Ei punttisarjoja tänään – välipäivän suositus (välipäivä{" "}
                    {(recommendation.daysSinceLastStrength ?? 0) + 1}/
                    {recommendation.restDaysRequiredMin}–
                    {recommendation.restDaysRequiredMax})
                  </span>
                </div>
                <p className="text-zinc-200 leading-relaxed text-sm">
                  Keskushermosto ja alaselkä palautuvat nyt edellisestä
                  voimatreenistä ({recommendation.lastStrengthLog?.title}).{" "}
                  <strong className="text-white">
                    Tänään sopii erinomaisesti 20–30 min kevyt PK-lenkki,
                    palauttava kävely tai lepo.
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenOtherWorkoutModal}
                className="apple-press shrink-0 self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#34C759] text-black text-sm font-bold shadow-sm"
              >
                Kirjaa päivän lenkki / lepo
              </button>
            </div>
          )}

        {/* Jos tänään on jo tehty ja kirjattu treeni tai lenkki, näytetään se heti tässä ensimmäisenä kuvahahmolla ja muokkausmahdollisuudella! */}
        {todaysLogs.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-white/10 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#30D158] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tänään kirjattu suoritus ({todaysLogs.length} kpl)</span>
            </div>
            {todaysLogs.map((tLog) => {
              const cat = SPORT_CATEGORIES[tLog.category];
              const isEditingThisLog = editingLoggedId === tLog.id;
              const kmVal = extractDistanceKmFromLog(tLog);

              return (
                <div
                  key={tLog.id}
                  className="rounded-2xl border border-[#34C759]/40 bg-gradient-to-r from-[#34C759]/12 via-white/[0.03] to-transparent p-3.5 sm:p-4 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Hauska lajikuvahahmo */}
                    <SportCharacterAvatar
                      category={tLog.category}
                      title={tLog.title}
                      feelings={tLog.feelings}
                      size="lg"
                    />

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                            style={cat.badgeStyle}
                          >
                            {cat.shortLabel}
                          </span>
                          <span className="text-sm sm:text-base font-bold text-white">
                            {tLog.title}
                          </span>
                          {kmVal !== null ? (
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#34C759]/25 border border-[#34C759]/50 text-xs font-extrabold text-[#30D158]">
                              {String(kmVal).replace(".", ",")} km
                            </span>
                          ) : tLog.category === "run" || tLog.category === "ski" ? (
                            <button
                              type="button"
                              onClick={() => setEditingLoggedId(tLog.id)}
                              className="apple-press px-2.5 py-0.5 rounded-lg bg-[#34C759]/15 hover:bg-[#34C759]/25 border border-dashed border-[#34C759]/50 text-xs font-semibold text-[#30D158]"
                            >
                              + Lisää km (esim. Withings)
                            </button>
                          ) : null}
                          {tLog.durationMinutes ? (
                            <span className="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-semibold text-zinc-200">
                              {tLog.durationMinutes} min
                            </span>
                          ) : null}
                        </div>

                        {/* Muokkaa / Poista -painikkeet */}
                        {!isEditingThisLog && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingLoggedId(tLog.id)}
                              className="apple-press inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#64D2FF]" />
                              <span>Muokkaa</span>
                            </button>
                            {onDeleteLog && (
                              <button
                                type="button"
                                onClick={() => onDeleteLog(tLog.id)}
                                title="Poista suoritus"
                                className="apple-press p-1.5 rounded-xl bg-white/6 hover:bg-[#FF453A]/20 border border-white/10 text-zinc-400 hover:text-[#FF6961]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {!isEditingThisLog ? (
                        tLog.feelings && (
                          <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                            {tLog.feelings}
                          </p>
                        )
                      ) : (
                        <WorkoutLogEditor
                          log={tLog}
                          onSave={(updated) => {
                            onSaveStrengthLog(updated, false);
                            setEditingLoggedId(null);
                          }}
                          onCancel={() => setEditingLoggedId(null)}
                          onDelete={
                            onDeleteLog
                              ? (id) => {
                                onDeleteLog(id);
                                setEditingLoggedId(null);
                              }
                              : undefined
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* VÄLITÖN TSEMPPARI- & FYSIIKKAPALAUTE (Ponnahtaa esiin heti kun lenkki tai voimatreeni on kirjattu!) */}
      {instantFeedback && (
        <section
          ref={feedbackSectionRef}
          role="status"
          className={`apple-glass scroll-mt-24 min-w-0 overflow-hidden rounded-3xl p-4 sm:p-5 border transition-all ${instantFeedback.tone === "positive"
            ? "border-[#34C759]/60 bg-gradient-to-br from-[#34C759]/18 via-[#0A84FF]/10 to-transparent shadow-[0_0_25px_rgba(52,199,89,0.18)]"
            : "border-[#FF9F0A]/60 bg-gradient-to-br from-[#FF9F0A]/18 via-[#0A84FF]/10 to-transparent"
            }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ${instantFeedback.tone === "positive"
                    ? "bg-[#34C759] text-black"
                    : "bg-[#FF9F0A] text-black"
                    }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{instantFeedback.badgeText}</span>
                </span>
                <span className="text-xs font-semibold text-[#64D2FF]">
                  Valmentajan välitön palaute & kuormitusanalyysi
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-white">
                {instantFeedback.headline}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">
                {instantFeedback.encouragement}
              </p>

              <div className="rounded-2xl bg-black/40 border border-white/10 p-3 space-y-1.5 text-xs text-zinc-300">
                <div>
                  <strong className="text-[#64D2FF]">
                    Fysiologinen vaikutus:
                  </strong>{" "}
                  {instantFeedback.physiologicalNote}
                </div>
                <div>
                  <strong className="text-[#30D158]">Seuraava askel:</strong>{" "}
                  {instantFeedback.nextStepHint}
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={onDismissFeedback}
                  className="apple-press inline-flex items-center gap-1.5 rounded-2xl bg-[#30D158] px-4 py-2 text-xs font-bold text-black shadow-sm transition hover:brightness-110"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Kuittaa luetuksi</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismissFeedback}
              aria-label="Sulje palaute"
              className="apple-press p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* KORTTI 2: SEURAAVA VOIMATREENI OHJELMASSA (Kompakti otsikko + haitari lisätiedoille) */}
      <section className="apple-glass min-w-0 overflow-hidden rounded-3xl p-4 sm:p-5 border border-white/12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64D2FF]">
              {isRecommendedWorkout
                ? "Seuraavana vuorossa oleva voimatreeni"
                : "Valittu voimatreeni"}
            </span>
            <h1 className="apple-display text-white mt-0.5">
              {baseWorkout.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowWorkoutDetails((v) => !v)}
              aria-expanded={showWorkoutDetails}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-xs sm:text-sm font-medium text-zinc-200"
            >
              <span>{showWorkoutDetails ? "Piilota tiedot" : "Ohjeet & vaihda"}</span>
              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showWorkoutDetails ? "rotate-90" : ""
                  }`}
              />
            </button>
            <button
              type="button"
              onClick={onNavigateToProgram}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] border border-white/10 text-xs sm:text-sm font-medium text-zinc-200"
            >
              <span>8 vk ohjelma</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        {showWorkoutDetails && (
          <div className="mt-3.5 space-y-3.5 pt-3.5 border-t border-white/10">
            {/* Valmentajan ydinohje kyseiselle treenille */}
            <div className="rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/25 p-3.5 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-[#64D2FF] shrink-0 mt-0.5" />
              <div className="text-sm text-zinc-200 leading-relaxed">
                {baseWorkout.coachNotes}
              </div>
            </div>

            {/* Harjoitusvalitsin + Kuittaa kaikki sarjat */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto flex-1">
                <label
                  htmlFor="workout-selector"
                  className="text-sm font-medium text-zinc-400 shrink-0"
                >
                  Vaihda:
                </label>
                <select
                  id="workout-selector"
                  value={baseWorkout.id}
                  onChange={(e) => onSelectWorkoutId(e.target.value)}
                  className="w-full sm:w-auto max-w-full min-w-0 truncate rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-sm font-medium text-white focus:border-[#0A84FF] focus:outline-none"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.structureLabel})
                      {p.id === recommendation.nextWorkout.id
                        ? " (Vuorossa nyt)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={markEntireWorkoutDone}
                  className="apple-press flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30 border border-[#0A84FF]/40 text-sm font-semibold text-[#64D2FF]"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
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
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Liikkeet ja sarjat: Selkeästi erottuva Toteutettavat liikkeet -osio */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#409CFF] shadow-[0_0_10px_#409CFF]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64D2FF]">
              Toteutettavat liikkeet
            </h3>
          </div>
          <span className="text-xs font-semibold text-zinc-400">
            {sessionExercises.filter(
              (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)
            ).length}
            /{sessionExercises.length} liikettä kuitattu
          </span>
        </div>

        {sessionExercises.map((exercise, exIndex) => {
          const exDoneCount = exercise.sets.filter((s) => s.done).length;
          const allExDone =
            exercise.sets.length > 0 && exDoneCount === exercise.sets.length;
          const isEditingName = editingExerciseId === exercise.id;
          const isSpeedExercise =
            exercise.code === "SPEED_B" || exercise.code === "SPEED_DL";
          const isSkillCircuit =
            exercise.code === "SKILL" &&
            !exercise.id.includes("human-flag") &&
            !exercise.id.includes("rest");
          const isSingleCheckExercise =
            isSpeedExercise || exercise.code === "SKILL";
          const firstSet = exercise.sets[0];

          return (
            <div
              key={exercise.id}
              className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 backdrop-blur-2xl border-2 transition-all duration-300 ${allExDone
                ? "border-[#30D158]/85 bg-gradient-to-br from-[#30D158]/24 via-[#0F2418]/90 to-[#0B1117]/90 shadow-[0_0_36px_rgba(48,209,88,0.28),inset_0_1px_0_rgba(48,209,88,0.35)]"
                : "border-[#409CFF]/55 bg-gradient-to-br from-[#0A84FF]/[0.18] via-[#141E33]/95 to-[#5E5CE6]/[0.14] shadow-[0_12px_36px_rgba(10,132,255,0.2),inset_0_1px_0_rgba(255,255,255,0.22)] hover:border-[#64D2FF]/75"
                }`}
            >
              {/* Liikkeen otsikko & pikakuittaus */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/12">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold transition-all ${allExDone
                        ? "bg-[#30D158] text-black shadow-[0_0_14px_rgba(48,209,88,0.6)]"
                        : "bg-gradient-to-br from-[#64D2FF] to-[#0A84FF] text-black shadow-[0_0_14px_rgba(10,132,255,0.5)]"
                        }`}
                    >
                      {allExDone ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        exIndex + 1
                      )}
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

                    <span
                      className={`inline-block max-w-full break-words px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold leading-snug border transition-colors ${allExDone
                        ? "bg-[#30D158]/20 text-[#30D158] border-[#30D158]/50"
                        : "bg-white/8 text-zinc-200 border-white/10"
                        }`}
                    >
                      Suunnitelma: {exercise.summary}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-400 flex items-center gap-3 flex-wrap">
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
                  className={`apple-press inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border shrink-0 transition-all ${allExDone
                    ? "bg-[#30D158] text-black border-[#30D158] shadow-[0_0_20px_rgba(48,209,88,0.48)]"
                    : "bg-gradient-to-r from-[#0A84FF]/28 to-[#64D2FF]/18 hover:from-[#0A84FF]/40 hover:to-[#64D2FF]/28 text-white border-[#64D2FF]/60 shadow-[0_0_18px_rgba(10,132,255,0.3),inset_0_1px_0_rgba(255,255,255,0.22)]"
                    }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {isSingleCheckExercise
                      ? allExDone
                        ? "Kuitattu ✓"
                        : "Kuittaa tehdyksi"
                      : allExDone
                        ? `Kaikki tehty (${exDoneCount}/${exercise.sets.length})`
                        : "Kuittaa liikkeen sarjat"}
                  </span>
                </button>
              </div>

              {/* Nopeusvoima (sarjat & paino) tai kehonhallinta-kierrokset (valittava kierrosmäärä) */}
              {isSpeedExercise && firstSet ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <span className="text-xs font-medium text-zinc-400">
                    Halutessasi tarkenna määrä & paino:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor={`${firstSet.id}-speed-reps`}
                        className="text-xs text-zinc-400"
                      >
                        Sarjat:
                      </label>
                      <input
                        id={`${firstSet.id}-speed-reps`}
                        type="text"
                        value={firstSet.actualReps ?? firstSet.reps}
                        onChange={(e) =>
                          updateSetField(
                            exercise.id,
                            firstSet.id,
                            "actualReps",
                            e.target.value
                          )
                        }
                        className="w-28 rounded-xl border border-white/15 bg-black/50 px-2 py-1 text-center text-xs font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                      />
                    </div>
                    <span className="text-zinc-500 text-xs font-bold">×</span>
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor={`${firstSet.id}-speed-weight`}
                        className="text-xs text-zinc-400"
                      >
                        Kg:
                      </label>
                      <input
                        id={`${firstSet.id}-speed-weight`}
                        type="text"
                        value={firstSet.actualWeightKg ?? firstSet.weightKg}
                        onChange={(e) =>
                          updateSetField(
                            exercise.id,
                            firstSet.id,
                            "actualWeightKg",
                            e.target.value
                          )
                        }
                        className="w-20 rounded-xl border border-white/15 bg-black/50 px-2 py-1 text-center text-xs font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : isSkillCircuit && firstSet ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <span className="text-xs font-medium text-zinc-300">
                    Tehtyjen kierrosten määrä (oletus 3):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {["2", "3", "4"].map((count) => {
                      const currentVal = (
                        firstSet.actualReps ??
                        firstSet.reps ??
                        "3"
                      ).trim();
                      const active = currentVal === count;
                      return (
                        <button
                          key={count}
                          type="button"
                          onClick={() =>
                            updateSetField(
                              exercise.id,
                              firstSet.id,
                              "actualReps",
                              count
                            )
                          }
                          className={`apple-press rounded-lg px-2.5 py-1 text-xs font-semibold border transition ${active
                            ? "bg-[#30D158]/25 border-[#30D158]/60 text-[#30D158]"
                            : "bg-black/40 border-white/12 text-zinc-300 hover:bg-white/10"
                            }`}
                        >
                          {count} krs
                        </button>
                      );
                    })}
                    <input
                      aria-label="Kierrosten määrä"
                      type="text"
                      value={firstSet.actualReps ?? firstSet.reps}
                      onChange={(e) =>
                        updateSetField(
                          exercise.id,
                          firstSet.id,
                          "actualReps",
                          e.target.value
                        )
                      }
                      className="w-12 rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-center text-xs font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                    />
                  </div>
                </div>
              ) : isSingleCheckExercise ? null : (
                /* Sarjarivit: valintaruutu + muokattavat toistot & kilot */
                <div className="mt-3.5 space-y-2">
                  {exercise.sets.map((set) => {
                    const isTop = set.type === "top";
                    const modified =
                      (set.actualReps && set.actualReps !== set.reps) ||
                      (set.actualWeightKg && set.actualWeightKg !== set.weightKg);

                    return (
                      <div
                        key={set.id}
                        className={`rounded-2xl p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${set.done
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
                            className={`apple-press w-7 h-7 rounded-xl flex items-center justify-center border transition-all shrink-0 ${set.done
                              ? "bg-[#34C759] border-[#34C759] text-black shadow-[0_0_12px_rgba(52,199,89,0.45)]"
                              : "bg-black/40 border-white/25 text-transparent hover:border-white/50"
                              }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                                Sarja {set.setNumber}
                              </span>
                              <span
                                className={`text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-md ${isTop
                                  ? "bg-[#FF3B30]/20 text-[#FF6961] border border-[#FF3B30]/35"
                                  : "bg-white/8 text-zinc-300"
                                  }`}
                              >
                                {set.label}
                              </span>
                              {set.targetRpe && (
                                <span className="text-xs text-zinc-400">
                                  RPE {set.targetRpe}
                                </span>
                              )}
                              {modified && (
                                <span className="text-xs font-medium text-[#FFD60A] bg-[#FF9F0A]/15 px-2 py-0.5 rounded-md">
                                  Muokattu tälle päivälle
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-zinc-400 mt-0.5">
                              Tavoite: {set.reps} × {set.weightKg} kg
                            </div>
                          </div>
                        </div>

                        {/* Muokattavat toistot ja paino (kg) */}
                        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1.5 sm:pt-0 border-t border-white/5 sm:border-0">
                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor={`${set.id}-reps`}
                              className="text-sm text-zinc-400"
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
                              className="w-14 sm:w-16 rounded-xl bg-black/50 border border-white/15 px-2 py-1.5 text-center text-sm font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                            />
                          </div>

                          <span className="text-zinc-500 font-bold">×</span>

                          <div className="flex items-center gap-1.5">
                            <label
                              htmlFor={`${set.id}-weight`}
                              className="text-sm text-zinc-400"
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
                              className="w-16 sm:w-20 rounded-xl bg-black/50 border border-white/15 px-2 py-1.5 text-center text-sm font-semibold text-white focus:border-[#0A84FF] focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSetDone(exercise.id, set.id)}
                            className={`apple-press px-3 py-1.5 rounded-xl text-sm font-semibold border shrink-0 ${set.done
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
              )}
            </div>
          );
        })}
      </section>

      {/* KORTTI: Treenin kuittaus & tuntemukset */}
      <section className="relative overflow-hidden rounded-3xl p-4 sm:p-5 space-y-4 backdrop-blur-2xl border-2 border-[#409CFF]/55 bg-gradient-to-br from-[#0A84FF]/[0.18] via-[#141E33]/95 to-[#5E5CE6]/[0.14] shadow-[0_12px_36px_rgba(10,132,255,0.2),inset_0_1px_0_rgba(255,255,255,0.22)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="apple-title text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#64D2FF]" />
              <span>
                Treenin kuittaus & tuntemukset ({completedSetsCount}/
                {totalSetsCount} sarjaa, {progressPercent} %)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
              Valitse numerot ja halutessasi sanele tuntemukset.
            </p>
          </div>

          <VoiceInputButton
            onTranscript={handleVoiceFeelingsDictation}
            label="Sanele vastaus"
          />
        </div>

        {/* Pikamittarit: Happi, Voimat, Hermosto & Kesto */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <span className="block text-xs font-medium text-zinc-200 mb-1.5">
              Miten happi kulki? (1–5)
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setOxygenScore(n)}
                  className={`apple-press flex-1 py-2 rounded-xl text-xs font-bold border transition ${oxygenScore === n
                    ? "bg-[#34C759]/30 border-[#30D158] text-[#30D158] shadow-[0_0_12px_rgba(48,209,88,0.3)]"
                    : "bg-black/40 border-white/15 text-zinc-300 hover:bg-white/10"
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-200 mb-1.5">
              Tangon nopeus & voimat (1–5)
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEnergyScore(n)}
                  className={`apple-press flex-1 py-2 rounded-xl text-xs font-bold border transition ${energyScore === n
                    ? "bg-[#0A84FF]/30 border-[#64D2FF] text-[#64D2FF] shadow-[0_0_12px_rgba(100,210,255,0.3)]"
                    : "bg-black/40 border-white/15 text-zinc-300 hover:bg-white/10"
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
              className="block text-xs font-medium text-zinc-200 mb-1.5"
            >
              Alaselän & hermoston tila
            </label>
            <select
              id="workout-recovery-select"
              value={recoveryStatus}
              onChange={(e) =>
                setRecoveryStatus(e.target.value as RecoveryStatus)
              }
              className="w-full rounded-xl bg-black/50 border border-white/15 px-2.5 py-2 text-xs text-white focus:border-[#0A84FF] focus:outline-none"
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
              className="block text-xs font-medium text-zinc-200 mb-1.5"
            >
              Treenin kesto (min)
            </label>
            <input
              id="workout-duration-input"
              type="number"
              min={1}
              max={240}
              placeholder="Auto (Withings)"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#0A84FF] focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="workout-feelings-textarea"
              className="block text-xs sm:text-sm font-semibold text-white"
            >
              Miten treeni meni, miten happi ja voimat riittivät (valinnainen)?
            </label>
            <VoiceInputButton
              onTranscript={handleVoiceFeelingsDictation}
              label="Sanele"
              compact
            />
          </div>

          {(selkosuomiPolishing || selkosuomiBadge) && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/15 border border-[#34C759]/35 px-3 py-1 text-[11px] font-semibold text-[#30D158]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {selkosuomiPolishing
                  ? "Viimeistellään sanelua selkosuomeksi..."
                  : selkosuomiBadge}
              </span>
            </div>
          )}

          <textarea
            id="workout-feelings-textarea"
            rows={3}
            value={feelings}
            onChange={(e) => {
              setFeelings(e.target.value);
              setSelkosuomiBadge(null);
            }}
            placeholder="Esim. 170 kg kolmonen tuli terävästi, happi kulki hyvin ja voimat riittivät loppuun asti..."
            className="w-full rounded-2xl bg-black/45 border border-white/15 p-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#0A84FF] focus:outline-none"
          />
        </div>
      </section>

      {/* ERILLINEN KORTTI: Menikö treeni suunnitelman mukaan? */}
      <section className="relative overflow-hidden rounded-3xl p-4 sm:p-5 space-y-3 backdrop-blur-2xl border-2 border-[#409CFF]/55 bg-gradient-to-br from-[#0A84FF]/[0.18] via-[#141E33]/95 to-[#5E5CE6]/[0.14] shadow-[0_12px_36px_rgba(10,132,255,0.2),inset_0_1px_0_rgba(255,255,255,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-white">
            Menikö treeni suunnitelman mukaan?
          </h3>
          <span className="text-[11px] text-zinc-300">
            Tausta-äly huomioi syyn palautumis- ja trendianalyysissä
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STRENGTH_DEVIATION_CHIPS.map((chip) => {
            const active = deviationReason === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setDeviationReason(chip)}
                className={`apple-press px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${active
                  ? chip === "Suunnitelman mukaan ✓"
                    ? "bg-[#34C759]/25 border-[#30D158] text-[#30D158]"
                    : "bg-[#FF9F0A]/25 border-[#FF9F0A] text-[#FFD60A]"
                  : "bg-black/45 border-white/12 text-zinc-300 hover:bg-white/[0.08]"
                  }`}
              >
                {chip}
              </button>
            );
          })}
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

        <div className="pt-1">
          <button
            type="button"
            onClick={() => handleCompleteWorkout(false)}
            className="apple-press w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#34C759] to-[#30D158] hover:brightness-105 text-sm sm:text-base font-extrabold text-black shadow-[0_0_24px_rgba(48,209,88,0.35)] transition"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Tallenna treeni</span>
          </button>
        </div>
      </section>
    </div>
  );
}
