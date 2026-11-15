export type SportCategory =
  | "strength"
  | "run"
  | "tennis"
  | "ski"
  | "other"
  | "rest";

export type RecoveryStatus =
  | "erinomainen"
  | "normaali"
  | "tukkoinen"
  | "flunssainen";

export interface PlannedSet {
  id: string;
  setNumber: number;
  type: "top" | "backoff" | "work" | "speed" | "skill";
  label: string;
  reps: string;
  weightKg: string;
  targetRpe?: string;
  done?: boolean;
  actualReps?: string;
  actualWeightKg?: string;
  notes?: string;
}

export interface ExercisePlan {
  id: string;
  name: string;
  code: "DL" | "B" | "L" | "S" | "VOL_L" | "SPEED_DL" | "SPEED_B" | "SKILL";
  summary: string;
  restMinutes: string;
  cue: string;
  sets: PlannedSet[];
}

export interface ProgramWorkout {
  id: string;
  cycleNumber: number;
  workoutNumber: 1 | 2 | 3;
  phase: "base" | "peaking";
  title: string;
  subtitle: string;
  structureLabel: string;
  restDaysAfterMin: number;
  restDaysAfterMax: number;
  restBetweenSets: string;
  coachNotes: string;
  exercises: ExercisePlan[];
  updatedAt?: string;
}

export interface WorkoutLog {
  id: string;
  performedDate: string; // YYYY-MM-DD
  category: SportCategory;
  title: string;
  cycleNumber?: number | null;
  workoutNumber?: number | null;
  programId?: string | null;
  durationMinutes?: number | null;
  rpe?: number | null;
  exercises: ExercisePlan[];
  feelings: string;
  oxygenScore?: number | null; // 1-5
  energyScore?: number | null; // 1-5
  recoveryStatus: RecoveryStatus;
  source: "workout_view" | "coach_chat" | "calendar" | "voice";
  createdAt: string;
}

export interface ProgramModificationProposal {
  id: string;
  targetWorkoutId: string;
  cycleNumber: number;
  workoutNumber: 1 | 2 | 3;
  reason: string;
  summary: string;
  updatedExercises: ExercisePlan[];
}

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  loggedWorkoutId?: string | null;
  loggedWorkoutSummary?: {
    performedDate: string;
    category: SportCategory;
    title: string;
    durationMinutes?: number | null;
    feelings: string;
  } | null;
  programProposal?: ProgramModificationProposal | null;
  proposalStatus?: "pending" | "approved" | "rejected" | null;
  createdAt: string;
}

export interface SportCategoryMeta {
  id: SportCategory;
  label: string;
  shortLabel: string;
  appleColorName: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  badgeStyle: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
}
