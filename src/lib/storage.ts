import { INITIAL_PROGRAM_WORKOUTS } from "./programData";
import { supabase } from "./supabaseClient";
import {
  CoachMessage,
  ExercisePlan,
  ProgramModificationProposal,
  ProgramWorkout,
  WorkoutLog,
} from "./types";
import { sanitizeWorkoutLogToSelkosuomi } from "./workoutParser";

const STORAGE_KEYS = {
  PROGRAMS: "treenimaster_programs_v4",
  LOGS: "treenimaster_logs_v3",
  MESSAGES: "treenimaster_messages_v3",
  INITIALIZED: "treenimaster_initialized_v3",
};

export function formatLocalISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToISODate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return formatLocalISODate(dt);
}

export function diffDaysISO(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  const utc1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
  const utc2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function createInitialSeedLogs(todayISO: string): WorkoutLog[] {
  const yesterdayISO = addDaysToISODate(todayISO, -1);

  return [
    {
      id: "real-log-c1-w1",
      performedDate: yesterdayISO,
      category: "strength",
      title: "Kierto 1 · Treeni 1: Pääveto, pääpenkki & lisäpainoleuat",
      cycleNumber: 1,
      workoutNumber: 1,
      programId: "cycle-1-workout-1",
      durationMinutes: 65,
      rpe: 8.5,
      exercises: [
        {
          id: "c1-w1-dl",
          name: "Maastaveto (DL)",
          code: "DL",
          summary: "1×3×170 kg + 2×5×147,5 kg",
          restMinutes: "4–5 min",
          cue: "Räjähtävä irrotus lattiasta, 1–1,5 toiston tekninen reservi",
          sets: [
            {
              id: "c1-w1-dl-s1",
              setNumber: 1,
              type: "top",
              label: "Herätesarja (PAP)",
              reps: "3",
              weightKg: "170",
              targetRpe: "8.5",
              done: true,
              actualReps: "3",
              actualWeightKg: "170",
            },
            {
              id: "c1-w1-dl-s2",
              setNumber: 2,
              type: "backoff",
              label: "Back-off 1",
              reps: "5",
              weightKg: "147.5",
              targetRpe: "8.0",
              done: true,
              actualReps: "5",
              actualWeightKg: "147.5",
            },
            {
              id: "c1-w1-dl-s3",
              setNumber: 3,
              type: "backoff",
              label: "Back-off 2",
              reps: "5",
              weightKg: "147.5",
              targetRpe: "8.0",
              done: true,
              actualReps: "5",
              actualWeightKg: "147.5",
            },
          ],
        },
        {
          id: "c1-w1-b",
          name: "Penkkipunnerrus (B)",
          code: "B",
          summary: "1×3×95 kg + 2×5×82,5 kg",
          restMinutes: "3–4 min",
          cue: "Lapatuki tiukkana ja terävä punnerrus rinnalta",
          sets: [
            {
              id: "c1-w1-b-s1",
              setNumber: 1,
              type: "top",
              label: "Herätesarja (PAP)",
              reps: "3",
              weightKg: "95",
              targetRpe: "8.5",
              done: true,
              actualReps: "3",
              actualWeightKg: "95",
            },
            {
              id: "c1-w1-b-s2",
              setNumber: 2,
              type: "backoff",
              label: "Back-off 1",
              reps: "5",
              weightKg: "82.5",
              targetRpe: "8.0",
              done: true,
              actualReps: "5",
              actualWeightKg: "82.5",
            },
            {
              id: "c1-w1-b-s3",
              setNumber: 3,
              type: "backoff",
              label: "Back-off 2",
              reps: "5",
              weightKg: "82.5",
              targetRpe: "8.0",
              done: true,
              actualReps: "5",
              actualWeightKg: "82.5",
            },
          ],
        },
        {
          id: "c1-w1-l",
          name: "Lisäpainoleuanveto (L)",
          code: "L",
          summary: "1×3×+40 kg + 2×5×+27,5 kg",
          restMinutes: "3–4 min",
          cue: "Jätetään 1–1,5 toistoa varaa, leuka reilusti tangon yli",
          sets: [
            {
              id: "c1-w1-l-s1",
              setNumber: 1,
              type: "top",
              label: "Herätesarja (PAP)",
              reps: "3",
              weightKg: "+40",
              targetRpe: "8.5",
              done: true,
              actualReps: "3",
              actualWeightKg: "+40",
            },
            {
              id: "c1-w1-l-s2",
              setNumber: 2,
              type: "backoff",
              label: "Back-off 1",
              reps: "5",
              weightKg: "+27.5",
              targetRpe: "8.0",
              done: true,
              actualReps: "5",
              actualWeightKg: "+27.5",
            },
            {
              id: "c1-w1-l-s3",
              setNumber: 3,
              type: "backoff",
              label: "Back-off 2",
              reps: "5",
              weightKg: "+27.5",
              targetRpe: "8.0",
              done: true,
              actualReps: "5",
              actualWeightKg: "+27.5",
            },
          ],
        },
      ],
      feelings:
        "Ohjelman avaus suoritettu: maastavedossa 1×3×170 kg + 2×5×147,5 kg, penkissä 1×3×95 kg + 2×5×82,5 kg ja lisäpainoleuoissa 1×3×+40 kg + 2×5×+27,5 kg.",
      oxygenScore: 4,
      energyScore: 4,
      recoveryStatus: "normaali",
      source: "workout_view",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

function createInitialMessages(todayISO: string): CoachMessage[] {
  const yesterdayISO = addDaysToISODate(todayISO, -1);
  return [
    {
      id: "welcome-msg-c1w1",
      role: "assistant",
      content: `**Kierto 1 on käynnistynyt ja tallennettu Supabaseen.** Avaustreenisi (${yesterdayISO}, **Kierto 1 · Treeni 1**) on kirjattu kalenteriin tarkkoine kuormineen:\n- **Maastaveto:** 1×3×170 kg + **2×5×147,5 kg**\n- **Penkkipunnerrus:** 1×3×95 kg + **2×5×82,5 kg**\n- **Lisäpainoleuanveto:** 1×3×+40 kg + **2×5×+27,5 kg**\n\n**Palautumisohje:** Raskaan vetopäivän jälkeen pidetään 2 täyttä lepopäivää, jotta alaselkä ja keskushermosto palautuvat kunnolla. Seuraavana voimatreeninä vuorossa on **Kierto 1 · Treeni 2 (Etukyykky 1×3×112,5 kg + 2×5×97,5 kg & Volyymileuanveto +15 kg / +20 kg rajoille asti)**.`,
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
  ];
}

// ============================================================================
// LOCAL-FIRST GETTERS & SETTERS + BACKGROUND SUPABASE SYNC
// ============================================================================

export function getLocalPrograms(): ProgramWorkout[] {
  if (typeof window === "undefined") return INITIAL_PROGRAM_WORKOUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PROGRAMS);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_KEYS.PROGRAMS,
        JSON.stringify(INITIAL_PROGRAM_WORKOUTS)
      );
      return INITIAL_PROGRAM_WORKOUTS;
    }
    const parsed = JSON.parse(raw) as ProgramWorkout[];
    return parsed.length > 0 ? parsed : INITIAL_PROGRAM_WORKOUTS;
  } catch {
    return INITIAL_PROGRAM_WORKOUTS;
  }
}

export function getLocalLogs(todayISO: string = formatLocalISODate()): WorkoutLog[] {
  if (typeof window === "undefined") return createInitialSeedLogs(todayISO);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      const seeds = createInitialSeedLogs(todayISO);
      window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(seeds));
      return seeds;
    }
    const parsed = JSON.parse(raw) as WorkoutLog[];
    let anyChanged = false;
    const sanitized = parsed.map((l) => {
      const res = sanitizeWorkoutLogToSelkosuomi(l);
      if (res.changed) anyChanged = true;
      return res.log;
    });
    if (anyChanged) {
      window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return createInitialSeedLogs(todayISO);
  }
}

export function getLocalMessages(
  todayISO: string = formatLocalISODate()
): CoachMessage[] {
  if (typeof window === "undefined") return createInitialMessages(todayISO);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!raw) {
      const seeds = createInitialMessages(todayISO);
      window.localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(seeds));
      return seeds;
    }
    return JSON.parse(raw) as CoachMessage[];
  } catch {
    return createInitialMessages(todayISO);
  }
}

export async function syncInitialDataWithSupabase(
  todayISO: string = formatLocalISODate()
): Promise<{
  programs: ProgramWorkout[];
  logs: WorkoutLog[];
  messages: CoachMessage[];
  cloudConnected: boolean;
}> {
  const localPrograms = getLocalPrograms();
  const localLogs = getLocalLogs(todayISO);
  const localMessages = getLocalMessages(todayISO);

  try {
    // 1. Hae ohjelma Supabasesta
    const { data: remotePrograms, error: progErr } = await supabase
      .from("treenimaster_programs")
      .select("*")
      .order("cycle_number", { ascending: true })
      .order("workout_number", { ascending: true });

    let finalPrograms = localPrograms;

    if (!progErr && remotePrograms) {
      if (remotePrograms.length === 0) {
        // Seedaa 8 viikon + 4 viikon piikkauksen ohjelma Supabaseen taustalla
        const rows = localPrograms.map((p) => ({
          id: p.id,
          cycle_number: p.cycleNumber,
          workout_number: p.workoutNumber,
          phase: p.phase,
          title: p.title,
          structure_label: p.structureLabel,
          rest_days_aftermin: p.restDaysAfterMin,
          rest_days_aftermax: p.restDaysAfterMax,
          rest_between_sets: p.restBetweenSets,
          coach_notes: p.coachNotes,
          exercises: p.exercises,
          updated_at: new Date().toISOString(),
        }));
        void supabase.from("treenimaster_programs").upsert(rows);
      } else {
        finalPrograms = remotePrograms.map((r) => ({
          id: r.id,
          cycleNumber: r.cycle_number,
          workoutNumber: r.workout_number as 1 | 2 | 3,
          phase: (r.phase as "base" | "peaking") || "base",
          title: r.title,
          subtitle:
            r.workout_number === 1
              ? "Pääveto, pääpenkki & lisäpainoleuat"
              : r.workout_number === 2
              ? "Etukyykky, volyymileuka & nopeuspenkki"
              : "Nopeusmaastaveto, käsilläseisonta & keskivartalo",
          structureLabel: r.structure_label,
          restDaysAfterMin: r.rest_days_aftermin ?? r.rest_days_afterMin ?? 2,
          restDaysAfterMax: r.rest_days_aftermax ?? r.rest_days_afterMax ?? 3,
          restBetweenSets: r.rest_between_sets || "3–5 min",
          coachNotes: r.coach_notes || "",
          exercises: (r.exercises as ExercisePlan[]) || [],
          updatedAt: r.updated_at,
        }));

        // Jos Supabasessa on vielä vanha ohjelmarakenne ilman Treeni 2:n nopeuspenkkiä, päivitetään se kerran
        const c1w2 = finalPrograms.find((p) => p.id === "cycle-1-workout-2");
        if (!c1w2?.exercises?.some((e) => e.code === "SPEED_B")) {
          finalPrograms = INITIAL_PROGRAM_WORKOUTS;
          const updatedRows = finalPrograms.map((p) => ({
            id: p.id,
            cycle_number: p.cycleNumber,
            workout_number: p.workoutNumber,
            phase: p.phase,
            title: p.title,
            structure_label: p.structureLabel,
            rest_days_aftermin: p.restDaysAfterMin,
            rest_days_aftermax: p.restDaysAfterMax,
            rest_between_sets: p.restBetweenSets,
            coach_notes: p.coachNotes,
            exercises: p.exercises,
            updated_at: new Date().toISOString(),
          }));
          void supabase.from("treenimaster_programs").upsert(updatedRows);
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            STORAGE_KEYS.PROGRAMS,
            JSON.stringify(finalPrograms)
          );
        }
      }
    }

    // 2. Hae treenilokit Supabasesta
    const { data: remoteLogs, error: logsErr } = await supabase
      .from("treenimaster_logs")
      .select("*")
      .order("performed_date", { ascending: false });

    let finalLogs = localLogs;
    if (!logsErr && remoteLogs) {
      if (remoteLogs.length === 0) {
        const logRows = localLogs.map(mapWorkoutLogToRow);
        void supabase.from("treenimaster_logs").upsert(logRows);
      } else {
        finalLogs = remoteLogs.map((r) => {
          const mapped = mapRowToWorkoutLog(r);
          const sanitized = sanitizeWorkoutLogToSelkosuomi(mapped);
          if (sanitized.changed) {
            void supabase
              .from("treenimaster_logs")
              .upsert(mapWorkoutLogToRow(sanitized.log));
          }
          return sanitized.log;
        });
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            STORAGE_KEYS.LOGS,
            JSON.stringify(finalLogs)
          );
        }
      }
    }

    // 3. Hae keskustelut Supabasesta
    const { data: remoteMsgs, error: msgsErr } = await supabase
      .from("treenimaster_messages")
      .select("*")
      .order("created_at", { ascending: true });

    let finalMessages = localMessages;
    if (!msgsErr && remoteMsgs && remoteMsgs.length > 0) {
      finalMessages = remoteMsgs.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        loggedWorkoutId: m.logged_workout_id,
        programProposal: m.program_proposal as ProgramModificationProposal | null,
        proposalStatus: m.proposal_status,
        createdAt: m.created_at,
      }));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEYS.MESSAGES,
          JSON.stringify(finalMessages)
        );
      }
    }

    const cloudConnected = !progErr && !logsErr;
    return {
      programs: finalPrograms,
      logs: finalLogs,
      messages: finalMessages,
      cloudConnected,
    };
  } catch {
    return {
      programs: localPrograms,
      logs: localLogs,
      messages: localMessages,
      cloudConnected: false,
    };
  }
}

function mapWorkoutLogToRow(log: WorkoutLog) {
  return {
    id: log.id,
    performed_date: log.performedDate,
    category: log.category,
    title: log.title,
    cycle_number: log.cycleNumber ?? null,
    workout_number: log.workoutNumber ?? null,
    program_id: log.programId ?? null,
    duration_minutes: log.durationMinutes ?? null,
    rpe: log.rpe ?? null,
    exercises: log.exercises ?? [],
    feelings: log.feelings ?? "",
    oxygen_score: log.oxygenScore ?? null,
    energy_score: log.energyScore ?? null,
    recovery_status: log.recoveryStatus ?? "normaali",
    source: log.source ?? "manual",
    created_at: log.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToWorkoutLog(r: any): WorkoutLog {
  return {
    id: r.id,
    performedDate: r.performed_date,
    category: r.category,
    title: r.title,
    cycleNumber: r.cycle_number,
    workoutNumber: r.workout_number,
    programId: r.program_id,
    durationMinutes: r.duration_minutes,
    rpe: r.rpe ? Number(r.rpe) : null,
    exercises: (r.exercises as ExercisePlan[]) || [],
    feelings: r.feelings || "",
    oxygenScore: r.oxygen_score,
    energyScore: r.energy_score,
    recoveryStatus: r.recovery_status || "normaali",
    source: r.source || "workout_view",
    createdAt: r.created_at,
  };
}

export function saveWorkoutLogOptimistic(
  newLog: WorkoutLog,
  currentLogs: WorkoutLog[]
): WorkoutLog[] {
  const filtered = currentLogs.filter((l) => l.id !== newLog.id);
  const updated = [newLog, ...filtered].sort((a, b) =>
    b.performedDate.localeCompare(a.performedDate)
  );
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  }
  void supabase
    .from("treenimaster_logs")
    .upsert(mapWorkoutLogToRow(newLog))
    .then(({ error }) => {
      if (error) {
        console.warn("Supabase treenilokin tallennus odottaa skeemaa:", error.message);
      }
    });
  return updated;
}

export function deleteWorkoutLogOptimistic(
  logId: string,
  currentLogs: WorkoutLog[]
): WorkoutLog[] {
  const updated = currentLogs.filter((l) => l.id !== logId);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
  }
  void supabase
    .from("treenimaster_logs")
    .delete()
    .eq("id", logId)
    .then(({ error }) => {
      if (error) {
        console.warn("Supabase poisto epäonnistui:", error.message);
      }
    });
  return updated;
}

export function saveCoachMessageOptimistic(
  msg: CoachMessage,
  currentMessages: CoachMessage[]
): CoachMessage[] {
  const exists = currentMessages.some((m) => m.id === msg.id);
  const updated = exists
    ? currentMessages.map((m) => (m.id === msg.id ? msg : m))
    : [...currentMessages, msg];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
  }

  void supabase
    .from("treenimaster_messages")
    .upsert({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      logged_workout_id: msg.loggedWorkoutId ?? null,
      program_proposal: msg.programProposal ?? null,
      proposal_status: msg.proposalStatus ?? null,
      created_at: msg.createdAt,
    })
    .then(({ error }) => {
      if (error) {
        console.warn("Supabase viestitallennus odottaa skeemaa:", error.message);
      }
    });

  return updated;
}

export function applyProgramProposalOptimistic(
  proposal: ProgramModificationProposal,
  currentPrograms: ProgramWorkout[]
): ProgramWorkout[] {
  const updated = currentPrograms.map((p) => {
    if (
      p.id === proposal.targetWorkoutId ||
      (p.cycleNumber === proposal.cycleNumber &&
        p.workoutNumber === proposal.workoutNumber)
    ) {
      const nextWorkout: ProgramWorkout = {
        ...p,
        exercises: proposal.updatedExercises,
        updatedAt: new Date().toISOString(),
      };
      void supabase.from("treenimaster_programs").upsert({
        id: nextWorkout.id,
        cycle_number: nextWorkout.cycleNumber,
        workout_number: nextWorkout.workoutNumber,
        phase: nextWorkout.phase,
        title: nextWorkout.title,
        structure_label: nextWorkout.structureLabel,
        rest_days_aftermin: nextWorkout.restDaysAfterMin,
        rest_days_aftermax: nextWorkout.restDaysAfterMax,
        rest_between_sets: nextWorkout.restBetweenSets,
        coach_notes: nextWorkout.coachNotes,
        exercises: nextWorkout.exercises,
        updated_at: nextWorkout.updatedAt,
      });
      return nextWorkout;
    }
    return p;
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(updated));
  }
  return updated;
}

export function saveProgramWorkoutOptimistic(
  updatedWorkout: ProgramWorkout,
  currentPrograms: ProgramWorkout[]
): ProgramWorkout[] {
  const stamped: ProgramWorkout = {
    ...updatedWorkout,
    updatedAt: new Date().toISOString(),
  };
  const updated = currentPrograms.map((p) =>
    p.id === stamped.id ? stamped : p
  );

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(updated));
  }

  void supabase
    .from("treenimaster_programs")
    .upsert({
      id: stamped.id,
      cycle_number: stamped.cycleNumber,
      workout_number: stamped.workoutNumber,
      phase: stamped.phase,
      title: stamped.title,
      structure_label: stamped.structureLabel,
      rest_days_aftermin: stamped.restDaysAfterMin,
      rest_days_aftermax: stamped.restDaysAfterMax,
      rest_between_sets: stamped.restBetweenSets,
      coach_notes: stamped.coachNotes,
      exercises: stamped.exercises,
      updated_at: stamped.updatedAt,
    })
    .then(({ error }) => {
      if (error) {
        console.warn("Supabase ohjelman muokkaus epäonnistui:", error.message);
      }
    });

  return updated;
}

// ============================================================================
// NEXT WORKOUT ENGINE (LIUKUVA MIKROSYKLI & PALAUTUMISLOGIIKKA)
// ============================================================================

export interface NextWorkoutRecommendation {
  nextWorkout: ProgramWorkout;
  lastStrengthLog: WorkoutLog | null;
  daysSinceLastStrength: number | null;
  restDaysRequiredMin: number;
  restDaysRequiredMax: number;
  readinessState: "ready" | "rest_recommended" | "completed_today";
  readinessHeadline: string;
  readinessDetail: string;
  recentAerobicCount7d: number;
  recentLogsBetween: WorkoutLog[];
}

export function computeNextRecommendedWorkout(
  programs: ProgramWorkout[],
  logs: WorkoutLog[],
  todayISO: string = formatLocalISODate()
): NextWorkoutRecommendation {
  const sortedStrengthLogs = logs
    .filter(
      (l) =>
        l.category === "strength" &&
        typeof l.cycleNumber === "number" &&
        l.cycleNumber >= 1 &&
        typeof l.workoutNumber === "number"
    )
    .sort((a, b) => {
      const dateCmp = b.performedDate.localeCompare(a.performedDate);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const lastStrengthLog = sortedStrengthLogs[0] || null;

  let nextCycle = 1;
  let nextWorkoutNum: 1 | 2 | 3 = 1;

  if (lastStrengthLog && lastStrengthLog.cycleNumber && lastStrengthLog.workoutNumber) {
    if (lastStrengthLog.workoutNumber === 1) {
      nextCycle = lastStrengthLog.cycleNumber;
      nextWorkoutNum = 2;
    } else if (lastStrengthLog.workoutNumber === 2) {
      nextCycle = lastStrengthLog.cycleNumber;
      nextWorkoutNum = 3;
    } else {
      nextCycle = Math.min(12, lastStrengthLog.cycleNumber + 1);
      nextWorkoutNum = 1;
    }
  }

  const nextWorkout =
    programs.find(
      (p) => p.cycleNumber === nextCycle && p.workoutNumber === nextWorkoutNum
    ) || programs[0];

  const sevenDaysAgo = addDaysToISODate(todayISO, -7);
  const recentAerobicCount7d = logs.filter(
    (l) =>
      l.performedDate >= sevenDaysAgo &&
      (l.category === "run" || l.category === "tennis" || l.category === "ski")
  ).length;

  if (!lastStrengthLog) {
    return {
      nextWorkout,
      lastStrengthLog: null,
      daysSinceLastStrength: null,
      restDaysRequiredMin: 2,
      restDaysRequiredMax: 3,
      readinessState: "ready",
      readinessHeadline: "Hermosto on palautunut – valmis Kiertoon 1",
      readinessDetail:
        "Edellisen piikkausjakson ja siirtymäkevennyksen jälkeen keskushermostosi on täysin latautunut. Tänään on optimaalinen päivä aloittaa Kierto 1 · Treeni 1.",
      recentAerobicCount7d,
      recentLogsBetween: [],
    };
  }

  const daysDiff = diffDaysISO(lastStrengthLog.performedDate, todayISO);
  // Täydet välipäivät = daysDiff - 1 (esim. treeni ma, tänään to -> ti & ke = 2 täyttä välipäivää)
  const fullRestDaysBetween = Math.max(0, daysDiff - 1);

  const prevProgramWorkout = programs.find(
    (p) =>
      p.cycleNumber === lastStrengthLog.cycleNumber &&
      p.workoutNumber === lastStrengthLog.workoutNumber
  );

  const restMin = prevProgramWorkout?.restDaysAfterMin ?? 2;
  const restMax = prevProgramWorkout?.restDaysAfterMax ?? 3;

  const recentLogsBetween = logs.filter(
    (l) =>
      l.performedDate > lastStrengthLog.performedDate &&
      l.performedDate <= todayISO
  );

  if (daysDiff === 0) {
    return {
      nextWorkout,
      lastStrengthLog,
      daysSinceLastStrength: 0,
      restDaysRequiredMin: restMin,
      restDaysRequiredMax: restMax,
      readinessState: "completed_today",
      readinessHeadline: `Päivän voimatreeni suoritettu (${lastStrengthLog.title})`,
      readinessDetail: `Seuraavana vuorossa on ${nextWorkout.title}. Pidä nyt ${restMin}–${restMax} täyttä lepopäivää ennen seuraavaa voimatreeniä, jotta keskushermosto ja jänteet palautuvat.`,
      recentAerobicCount7d,
      recentLogsBetween,
    };
  }

  if (fullRestDaysBetween < restMin) {
    const remaining = restMin - fullRestDaysBetween;
    return {
      nextWorkout,
      lastStrengthLog,
      daysSinceLastStrength: fullRestDaysBetween,
      restDaysRequiredMin: restMin,
      restDaysRequiredMax: restMax,
      readinessState: "rest_recommended",
      readinessHeadline: `Palautuminen käynnissä (${fullRestDaysBetween}/${restMin} välipäivää pidetty)`,
      readinessDetail: `Edellisestä voimatreenistä (${lastStrengthLog.title}) on ${fullRestDaysBetween} täyttä välipäivää. Suositus on ${restMin}–${restMax} välipäivää (vielä ${remaining} pv), mutta voit tarvittaessa tehdä kevyen lenkin tai suorittaa ${nextWorkout.title} jo tänään.`,
      recentAerobicCount7d,
      recentLogsBetween,
    };
  }

  return {
    nextWorkout,
    lastStrengthLog,
    daysSinceLastStrength: fullRestDaysBetween,
    restDaysRequiredMin: restMin,
    restDaysRequiredMax: restMax,
    readinessState: "ready",
    readinessHeadline: `Optimaalinen palautumisikkuna (${fullRestDaysBetween} välipäivää takana)`,
    readinessDetail: `Olet pitänyt ${fullRestDaysBetween} täyttä välipäivää edellisen voimatreenin (${lastStrengthLog.title}) jälkeen. Keskushermosto ja alaselkä ovat valmiit harjoitukseen ${nextWorkout.title}.`,
    recentAerobicCount7d,
    recentLogsBetween,
  };
}
