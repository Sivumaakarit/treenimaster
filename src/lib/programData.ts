import {
  ExercisePlan,
  PlannedSet,
  ProgramWorkout,
  SportCategory,
  SportCategoryMeta,
} from "./types";

export const SPORT_CATEGORIES: Record<SportCategory, SportCategoryMeta> = {
  strength: {
    id: "strength",
    label: "Kuntosali / voimatreeni",
    shortLabel: "Voima",
    appleColorName: "Apple System Blue / Red",
    hex: "#007AFF",
    bgClass: "bg-[#007AFF]/14",
    textClass: "text-[#0A84FF]",
    borderClass: "border-[#007AFF]/35",
    dotClass: "bg-gradient-to-r from-[#007AFF] to-[#FF3B30]",
    badgeStyle: {
      backgroundColor: "rgba(0, 122, 255, 0.14)",
      color: "#409CFF",
      borderColor: "rgba(0, 122, 255, 0.38)",
    },
  },
  run: {
    id: "run",
    label: "Juoksu / lenkki",
    shortLabel: "Juoksu",
    appleColorName: "Apple System Green",
    hex: "#34C759",
    bgClass: "bg-[#34C759]/14",
    textClass: "text-[#30D158]",
    borderClass: "border-[#34C759]/35",
    dotClass: "bg-[#34C759]",
    badgeStyle: {
      backgroundColor: "rgba(52, 199, 89, 0.14)",
      color: "#30D158",
      borderColor: "rgba(52, 199, 89, 0.38)",
    },
  },
  tennis: {
    id: "tennis",
    label: "Tennis",
    shortLabel: "Tennis",
    appleColorName: "Apple System Amber / Orange",
    hex: "#FF9F0A",
    bgClass: "bg-[#FF9F0A]/14",
    textClass: "text-[#FFD60A]",
    borderClass: "border-[#FF9F0A]/35",
    dotClass: "bg-gradient-to-r from-[#FFD60A] to-[#FF9F0A]",
    badgeStyle: {
      backgroundColor: "rgba(255, 159, 10, 0.15)",
      color: "#FFD60A",
      borderColor: "rgba(255, 159, 10, 0.4)",
    },
  },
  ski: {
    id: "ski",
    label: "Hiihto",
    shortLabel: "Hiihto",
    appleColorName: "Apple System Cyan / Ice",
    hex: "#32ADE6",
    bgClass: "bg-[#32ADE6]/14",
    textClass: "text-[#64D2FF]",
    borderClass: "border-[#32ADE6]/35",
    dotClass: "bg-[#32ADE6]",
    badgeStyle: {
      backgroundColor: "rgba(50, 173, 230, 0.15)",
      color: "#64D2FF",
      borderColor: "rgba(50, 173, 230, 0.4)",
    },
  },
  other: {
    id: "other",
    label: "Muu treeni / huoltava",
    shortLabel: "Muu treeni",
    appleColorName: "Apple System Purple",
    hex: "#AF52DE",
    bgClass: "bg-[#AF52DE]/14",
    textClass: "text-[#BF5AF2]",
    borderClass: "border-[#AF52DE]/35",
    dotClass: "bg-[#AF52DE]",
    badgeStyle: {
      backgroundColor: "rgba(175, 82, 222, 0.15)",
      color: "#BF5AF2",
      borderColor: "rgba(175, 82, 222, 0.4)",
    },
  },
  rest: {
    id: "rest",
    label: "Lepopäivä / palautuminen",
    shortLabel: "Lepopäivä",
    appleColorName: "Apple System Slate",
    hex: "#8E8E93",
    bgClass: "bg-[#8E8E93]/14",
    textClass: "text-[#AEAEB2]",
    borderClass: "border-[#8E8E93]/35",
    dotClass: "bg-[#8E8E93]",
    badgeStyle: {
      backgroundColor: "rgba(142, 142, 147, 0.15)",
      color: "#AEAEB2",
      borderColor: "rgba(142, 142, 147, 0.35)",
    },
  },
};

export const BASE_1RM = {
  deadlift: 205,
  bench: 112.5,
  frontSquat: 132.5,
  weightedPullup: 55,
  targetDeadlift: "210–215 kg",
  targetBench: "115–120 kg",
  targetFrontSquat: "135–140 kg",
  targetWeightedPullup: "+57,5–60 kg",
};

function makeSets(
  prefix: string,
  specs: Array<{
    type: PlannedSet["type"];
    label: string;
    reps: string;
    weightKg: string;
    targetRpe?: string;
  }>
): PlannedSet[] {
  return specs.map((s, idx) => ({
    id: `${prefix}-s${idx + 1}`,
    setNumber: idx + 1,
    type: s.type,
    label: s.label,
    reps: s.reps,
    weightKg: s.weightKg,
    targetRpe: s.targetRpe,
    done: false,
    actualReps: s.reps,
    actualWeightKg: s.weightKg,
  }));
}

interface CycleSpec {
  cycle: number;
  phase: "base" | "peaking";
  structure: string;
  dlSummary: string;
  dlSets: Array<{
    type: PlannedSet["type"];
    label: string;
    reps: string;
    weightKg: string;
    targetRpe?: string;
  }>;
  benchSummary: string;
  benchSets: Array<{
    type: PlannedSet["type"];
    label: string;
    reps: string;
    weightKg: string;
    targetRpe?: string;
  }>;
  pullSummary: string;
  pullSets: Array<{
    type: PlannedSet["type"];
    label: string;
    reps: string;
    weightKg: string;
    targetRpe?: string;
  }>;
  squatSummary: string;
  squatSets: Array<{
    type: PlannedSet["type"];
    label: string;
    reps: string;
    weightKg: string;
    targetRpe?: string;
  }>;
  volPullSummary: string;
  volPullReps: string;
  volPullWeight: string;
  volPullRpe: string;
  isDeload?: boolean;
}

const CYCLE_SPECS: CycleSpec[] = [
  // OSA 1: 8 KIERRON PERUSVOIMAJAKSO
  {
    cycle: 1,
    phase: "base",
    structure: "Sisäänajo & heräte (1 × 3 + 2 × 5)",
    dlSummary: "1×3×170 kg + 2×5×147,5 kg",
    dlSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "170", targetRpe: "8.5" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "147.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "147.5", targetRpe: "8.0" },
    ],
    benchSummary: "1×3×95 kg + 2×5×82,5 kg",
    benchSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "95", targetRpe: "8.5" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "82.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "82.5", targetRpe: "8.0" },
    ],
    pullSummary: "1×3×+40 kg + 2×5×+27,5 kg",
    pullSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "+40", targetRpe: "8.5" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "+27.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "+27.5", targetRpe: "8.0" },
    ],
    squatSummary: "1×3×112,5 kg + 2×5×97,5 kg",
    squatSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "112.5", targetRpe: "8.5" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "97.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "97.5", targetRpe: "8.0" },
    ],
    volPullSummary: "1 × max × +15 kg (12–15) tai +20 kg (10–12) (rajoille asti)",
    volPullReps: "10",
    volPullWeight: "+20",
    volPullRpe: "9.5",
  },
  {
    cycle: 2,
    phase: "base",
    structure: "Tasainen perusvoima (3 × 4)",
    dlSummary: "3×4×157,5 kg",
    dlSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "157.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "157.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "157.5", targetRpe: "8.5" },
    ],
    benchSummary: "3×4×87,5 kg",
    benchSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "87.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "87.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "87.5", targetRpe: "8.5" },
    ],
    pullSummary: "3×4×+32,5 kg",
    pullSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "+32.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "+32.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "+32.5", targetRpe: "8.5" },
    ],
    squatSummary: "3×4×102,5–105 kg",
    squatSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "102.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "102.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "102.5", targetRpe: "8.5" },
    ],
    volPullSummary: "1 × max × +15 kg tai +20–22,5 kg (rajoille asti)",
    volPullReps: "10",
    volPullWeight: "+20",
    volPullRpe: "9.5",
  },
  {
    cycle: 3,
    phase: "base",
    structure: "Terävämpi heräte (1 × 2 + 2 × 5)",
    dlSummary: "1×2×180 kg + 2×5×152,5 kg",
    dlSets: [
      { type: "top", label: "Terävä kakkonen (PAP)", reps: "2", weightKg: "180", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "152.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "152.5", targetRpe: "8.5" },
    ],
    benchSummary: "1×2×100 kg + 2×5×85 kg",
    benchSets: [
      { type: "top", label: "Terävä kakkonen (PAP)", reps: "2", weightKg: "100", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "85", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "85", targetRpe: "8.5" },
    ],
    pullSummary: "1×2×+45 kg + 2×5×+30 kg",
    pullSets: [
      { type: "top", label: "Terävä kakkonen (PAP)", reps: "2", weightKg: "+45", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "+30", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "+30", targetRpe: "8.5" },
    ],
    squatSummary: "1×2×117,5 kg + 2×5×100 kg",
    squatSets: [
      { type: "top", label: "Terävä kakkonen (PAP)", reps: "2", weightKg: "117.5", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "100", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "100", targetRpe: "8.5" },
    ],
    volPullSummary: "1 × max × +15 kg tai +20 kg (rajoille asti)",
    volPullReps: "10",
    volPullWeight: "+20",
    volPullRpe: "9.5",
  },
  {
    cycle: 4,
    phase: "base",
    structure: "Huoltava / kevennys (2 × 3)",
    dlSummary: "2×3×130–135 kg",
    dlSets: [
      { type: "work", label: "Huoltava sarja 1", reps: "3", weightKg: "130", targetRpe: "6.0" },
      { type: "work", label: "Huoltava sarja 2", reps: "3", weightKg: "130", targetRpe: "6.0" },
    ],
    benchSummary: "2×3×72,5 kg",
    benchSets: [
      { type: "work", label: "Huoltava sarja 1", reps: "3", weightKg: "72.5", targetRpe: "6.0" },
      { type: "work", label: "Huoltava sarja 2", reps: "3", weightKg: "72.5", targetRpe: "6.0" },
    ],
    pullSummary: "2×3×+15 kg",
    pullSets: [
      { type: "work", label: "Huoltava sarja 1", reps: "3", weightKg: "+15", targetRpe: "6.0" },
      { type: "work", label: "Huoltava sarja 2", reps: "3", weightKg: "+15", targetRpe: "6.0" },
    ],
    squatSummary: "2×3×85 kg",
    squatSets: [
      { type: "work", label: "Huoltava sarja 1", reps: "3", weightKg: "85", targetRpe: "6.0" },
      { type: "work", label: "Huoltava sarja 2", reps: "3", weightKg: "85", targetRpe: "6.0" },
    ],
    volPullSummary: "1 × 6–8 × +10 kg (kevyt huoltava pumppi, jätä 3–4 toistoa varaa)",
    volPullReps: "8",
    volPullWeight: "+10",
    volPullRpe: "6.0",
    isDeload: true,
  },
  {
    cycle: 5,
    phase: "base",
    structure: "Korotettu kuorma (1 × 3 + 2 × 5)",
    dlSummary: "1×3×175 kg + 2×5×152,5 kg",
    dlSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "175", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "152.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "152.5", targetRpe: "8.5" },
    ],
    benchSummary: "1×3×97,5 kg + 2×5×85 kg",
    benchSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "97.5", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "85", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "85", targetRpe: "8.5" },
    ],
    pullSummary: "1×3×+42,5 kg + 2×5×+30 kg",
    pullSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "+42.5", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "+30", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "+30", targetRpe: "8.5" },
    ],
    squatSummary: "1×3×115 kg + 2×5×100 kg",
    squatSets: [
      { type: "top", label: "Herätesarja (PAP)", reps: "3", weightKg: "115", targetRpe: "8.5-9" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "100", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "100", targetRpe: "8.5" },
    ],
    volPullSummary: "1 × max × +15 kg tai +20–22,5 kg (rajoille asti)",
    volPullReps: "10",
    volPullWeight: "+22.5",
    volPullRpe: "9.5",
  },
  {
    cycle: 6,
    phase: "base",
    structure: "Tasainen kova perusvoima (3 × 4)",
    dlSummary: "3×4×162,5 kg",
    dlSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "162.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "162.5", targetRpe: "8.5" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "162.5", targetRpe: "8.5" },
    ],
    benchSummary: "3×4×90 kg",
    benchSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "90", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "90", targetRpe: "8.5" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "90", targetRpe: "8.5" },
    ],
    pullSummary: "3×4×+35 kg",
    pullSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "+35", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "+35", targetRpe: "8.5" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "+35", targetRpe: "8.5" },
    ],
    squatSummary: "3×4×107,5 kg",
    squatSets: [
      { type: "work", label: "Työsarja 1", reps: "4", weightKg: "107.5", targetRpe: "8.0" },
      { type: "work", label: "Työsarja 2", reps: "4", weightKg: "107.5", targetRpe: "8.5" },
      { type: "work", label: "Työsarja 3", reps: "4", weightKg: "107.5", targetRpe: "8.5" },
    ],
    volPullSummary: "1 × max × +15 kg tai +20–22,5 kg (rajoille asti)",
    volPullReps: "10",
    volPullWeight: "+22.5",
    volPullRpe: "9.5",
  },
  {
    cycle: 7,
    phase: "base",
    structure: "Perusvoimajakson huippukierto (1 × 1 + 2 × 5)",
    dlSummary: "1×1×190–192,5 kg + 2×5×157,5 kg",
    dlSets: [
      { type: "top", label: "Terävä ykkönen (PAP)", reps: "1", weightKg: "190", targetRpe: "9.0" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "157.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "157.5", targetRpe: "8.5" },
    ],
    benchSummary: "1×1×105–107,5 kg + 2×5×87,5 kg",
    benchSets: [
      { type: "top", label: "Terävä ykkönen (PAP)", reps: "1", weightKg: "105", targetRpe: "9.0" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "87.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "87.5", targetRpe: "8.5" },
    ],
    pullSummary: "1×1×+50 kg + 2×5×+32,5 kg",
    pullSets: [
      { type: "top", label: "Terävä ykkönen (PAP)", reps: "1", weightKg: "+50", targetRpe: "9.0" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "+32.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "+32.5", targetRpe: "8.5" },
    ],
    squatSummary: "1×1×122,5–125 kg + 2×5×102,5 kg",
    squatSets: [
      { type: "top", label: "Terävä ykkönen (PAP)", reps: "1", weightKg: "122.5", targetRpe: "9.0" },
      { type: "backoff", label: "Back-off 1", reps: "5", weightKg: "102.5", targetRpe: "8.0" },
      { type: "backoff", label: "Back-off 2", reps: "5", weightKg: "102.5", targetRpe: "8.5" },
    ],
    volPullSummary: "1 × 8–12 × +15–20 kg (tiukka sarja, jätä 1 toisto varaa ennen kevennystä)",
    volPullReps: "10",
    volPullWeight: "+20",
    volPullRpe: "9.0",
  },
  {
    cycle: 8,
    phase: "base",
    structure: "Valmisteleva kevennys (2 × 2)",
    dlSummary: "2×2×135–140 kg",
    dlSets: [
      { type: "work", label: "Räjähtävä kakkonen 1", reps: "2", weightKg: "135", targetRpe: "6.0" },
      { type: "work", label: "Räjähtävä kakkonen 2", reps: "2", weightKg: "135", targetRpe: "6.0" },
    ],
    benchSummary: "2×2×75 kg",
    benchSets: [
      { type: "work", label: "Räjähtävä kakkonen 1", reps: "2", weightKg: "75", targetRpe: "6.0" },
      { type: "work", label: "Räjähtävä kakkonen 2", reps: "2", weightKg: "75", targetRpe: "6.0" },
    ],
    pullSummary: "2×2×+20 kg",
    pullSets: [
      { type: "work", label: "Räjähtävä kakkonen 1", reps: "2", weightKg: "+20", targetRpe: "6.0" },
      { type: "work", label: "Räjähtävä kakkonen 2", reps: "2", weightKg: "+20", targetRpe: "6.0" },
    ],
    squatSummary: "2×2×90 kg",
    squatSets: [
      { type: "work", label: "Räjähtävä kakkonen 1", reps: "2", weightKg: "90", targetRpe: "6.0" },
      { type: "work", label: "Räjähtävä kakkonen 2", reps: "2", weightKg: "90", targetRpe: "6.0" },
    ],
    volPullSummary: "1 × 6 × +10 kg (kevyt liikerata, ei uupumusta)",
    volPullReps: "6",
    volPullWeight: "+10",
    volPullRpe: "6.0",
    isDeload: true,
  },

  // OSA 2: 4 VIIKON PIIKKAUSJAKSO (Viikot 9–12)
  {
    cycle: 9,
    phase: "peaking",
    structure: "Piikkausvko 1: Raskas hermostollinen kakkonen (1 × 2)",
    dlSummary: "Nousu → 1×2×185 kg (ei pudotussarjoja)",
    dlSets: [
      { type: "top", label: "Hermostollinen kakkonen", reps: "2", weightKg: "185", targetRpe: "8.5-9" },
    ],
    benchSummary: "Nousu → 1×2×102,5 kg",
    benchSets: [
      { type: "top", label: "Hermostollinen kakkonen", reps: "2", weightKg: "102.5", targetRpe: "8.5-9" },
    ],
    pullSummary: "Nousu → 1×2×+47,5 kg",
    pullSets: [
      { type: "top", label: "Hermostollinen kakkonen", reps: "2", weightKg: "+47.5", targetRpe: "8.5-9" },
    ],
    squatSummary: "Nousu → 1×2×122,5 kg",
    squatSets: [
      { type: "top", label: "Hermostollinen kakkonen", reps: "2", weightKg: "122.5", targetRpe: "8.5-9" },
    ],
    volPullSummary: "1 × 6–8 × +15 kg (terävä pumppi, jätä 2–3 toistoa varaa)",
    volPullReps: "8",
    volPullWeight: "+15",
    volPullRpe: "7.0",
  },
  {
    cycle: 10,
    phase: "peaking",
    structure: "Piikkausvko 2: Submaksimaalinen heräteykkönen (1 × 1)",
    dlSummary: "Nousu → 1×1×195 kg (napakkana, 1 toisto varaa)",
    dlSets: [
      { type: "top", label: "Submaksimaalinen heräteykkönen", reps: "1", weightKg: "195", targetRpe: "9.0" },
    ],
    benchSummary: "Nousu → 1×1×107,5 kg",
    benchSets: [
      { type: "top", label: "Submaksimaalinen heräteykkönen", reps: "1", weightKg: "107.5", targetRpe: "9.0" },
    ],
    pullSummary: "Nousu → 1×1×+50–52,5 kg",
    pullSets: [
      { type: "top", label: "Submaksimaalinen heräteykkönen", reps: "1", weightKg: "+50", targetRpe: "9.0" },
    ],
    squatSummary: "Nousu → 1×1×127,5 kg",
    squatSets: [
      { type: "top", label: "Submaksimaalinen heräteykkönen", reps: "1", weightKg: "127.5", targetRpe: "9.0" },
    ],
    volPullSummary: "1 × 5 × +15 kg (kevyt ylläpito, ei uupumusta)",
    volPullReps: "5",
    volPullWeight: "+15",
    volPullRpe: "6.5",
  },
  {
    cycle: 11,
    phase: "peaking",
    structure: "Piikkausvko 3: Nopeusviritys & kevennys",
    dlSummary: "2×1×160 kg (pelkkä räjähtävä irrotus lattiasta)",
    dlSets: [
      { type: "speed", label: "Räjähtävä viritysykkönen 1", reps: "1", weightKg: "160", targetRpe: "6.5" },
      { type: "speed", label: "Räjähtävä viritysykkönen 2", reps: "1", weightKg: "160", targetRpe: "6.5" },
    ],
    benchSummary: "3×1×90 kg (maksimaalinen kiihtyvyys rinnalta)",
    benchSets: [
      { type: "speed", label: "Räjähtävä viritysykkönen 1", reps: "1", weightKg: "90", targetRpe: "6.5" },
      { type: "speed", label: "Räjähtävä viritysykkönen 2", reps: "1", weightKg: "90", targetRpe: "6.5" },
      { type: "speed", label: "Räjähtävä viritysykkönen 3", reps: "1", weightKg: "90", targetRpe: "6.5" },
    ],
    pullSummary: "2×2×+25 kg",
    pullSets: [
      { type: "speed", label: "Terävä kakkonen 1", reps: "2", weightKg: "+25", targetRpe: "6.5" },
      { type: "speed", label: "Terävä kakkonen 2", reps: "2", weightKg: "+25", targetRpe: "6.5" },
    ],
    squatSummary: "2×1×105 kg (kevyt liikerata, hyvä vatsapaine)",
    squatSets: [
      { type: "speed", label: "Viritysykkönen 1", reps: "1", weightKg: "105", targetRpe: "6.5" },
      { type: "speed", label: "Viritysykkönen 2", reps: "1", weightKg: "105", targetRpe: "6.5" },
    ],
    volPullSummary: "Jätetään pois tai 1 × 3 × BW (oma paino)",
    volPullReps: "3",
    volPullWeight: "Omapaino",
    volPullRpe: "5.0",
    isDeload: true,
  },
  {
    cycle: 12,
    phase: "peaking",
    structure: "Piikkausvko 4: ENNÄTYSVIIKKO / H-HETKET",
    dlSummary: "Lämmittelyt → 1×180 kg → 1×197,5 kg → 1×207,5–212,5 kg (UUSI ENNÄTYS!)",
    dlSets: [
      { type: "top", label: "Avausrauta", reps: "1", weightKg: "180", targetRpe: "8.0" },
      { type: "top", label: "Viimeistelynosto", reps: "1", weightKg: "197.5", targetRpe: "9.0" },
      { type: "top", label: "UUSI ENNÄTYS (PR!)", reps: "1", weightKg: "207.5", targetRpe: "9.5-10" },
    ],
    benchSummary: "Lämmittelyt → 1×100 kg → 1×107,5 kg → 1×115–117,5 kg (UUSI ENNÄTYS!)",
    benchSets: [
      { type: "top", label: "Avausrauta", reps: "1", weightKg: "100", targetRpe: "8.0" },
      { type: "top", label: "Välinosto", reps: "1", weightKg: "107.5", targetRpe: "9.0" },
      { type: "top", label: "UUSI ENNÄTYS (PR!)", reps: "1", weightKg: "115", targetRpe: "9.5-10" },
    ],
    pullSummary: "Lämmittelyt → 1×+40 kg → 1×+50 kg → 1×+57,5–60 kg (UUSI ENNÄTYS!)",
    pullSets: [
      { type: "top", label: "Avausrauta", reps: "1", weightKg: "+40", targetRpe: "8.0" },
      { type: "top", label: "Välinosto", reps: "1", weightKg: "+50", targetRpe: "9.0" },
      { type: "top", label: "UUSI ENNÄTYS (PR!)", reps: "1", weightKg: "+57.5", targetRpe: "9.5-10" },
    ],
    squatSummary: "Testipäivä 2: Lämmittelyt → 1×115 kg → 1×125 kg → 1×135–140 kg (UUSI ENNÄTYS!)",
    squatSets: [
      { type: "top", label: "Avausrauta", reps: "1", weightKg: "115", targetRpe: "8.0" },
      { type: "top", label: "Välinosto", reps: "1", weightKg: "125", targetRpe: "9.0" },
      { type: "top", label: "UUSI ENNÄTYS (PR!)", reps: "1", weightKg: "135", targetRpe: "9.5-10" },
    ],
    volPullSummary: "Kevyet palauttavat vatsojen availut ja venyttelyt",
    volPullReps: "1",
    volPullWeight: "Kehonhuolto",
    volPullRpe: "5.0",
  },
];

function buildSpeedDayExercises(cycle: number, isDeload?: boolean): ExercisePlan[] {
  const prefix = `c${cycle}-w3`;

  // Viikko 9: DL nopeus 4x1x140 kg, Käsilläseisonta & vatsarullaukset, Human Flag (valinnainen)
  if (cycle === 9) {
    return [
      {
        id: `${prefix}-speed-dl`,
        name: "Nopeusmaastaveto",
        code: "SPEED_DL",
        summary: "4 × 1 × 140 kg",
        restMinutes: "1 min",
        cue: "Maksimaalinen irrotusnopeus alustasta ilman uupumusta.",
        sets: makeSets(`${prefix}-sdl`, [
          { type: "speed", label: "Nopeusmaastaveto", reps: "4×1", weightKg: "140", targetRpe: "6.5" },
        ]),
      },
      {
        id: `${prefix}-skill`,
        name: "Käsilläseisonnat, vatsarullaukset, boksihypyt ja putkirullaukset",
        code: "SKILL",
        summary: "Kehonhallinta, keskivartalon nostot, vatsarullaukset, boksihypyt ja putkirullaukset",
        restMinutes: "2 min",
        cue: "Kehonhallinta, korsettipaineet ja kimmoisuus terävinä ilman maitohappoa.",
        sets: makeSets(`${prefix}-skill`, [
          { type: "skill", label: "Kierrokset", reps: "3", weightKg: "Kehonpaino", targetRpe: "6.5" },
        ]),
      },
      {
        id: `${prefix}-human-flag`,
        name: "Human Flag -harjoittelu (valinnainen)",
        code: "SKILL",
        summary: "Jos harjoittelit Human Flagia, kuittaa tehdyksi",
        restMinutes: "2 min",
        cue: "Kylkipito ja lapatuki – tehdään fiiliksen mukaan.",
        sets: makeSets(`${prefix}-hf`, [
          { type: "skill", label: "Human Flag", reps: "Valinnainen", weightKg: "Kehonpaino", targetRpe: "7.0" },
        ]),
      },
    ];
  }

  // Viikko 10: DL nopeus 3x1x140 kg, Käsilläseisonta & vatsarullaukset, Human Flag (valinnainen)
  if (cycle === 10) {
    return [
      {
        id: `${prefix}-speed-dl`,
        name: "Nopeusmaastaveto",
        code: "SPEED_DL",
        summary: "3 × 1 × 140 kg",
        restMinutes: "1 min",
        cue: "Terävä irrotus lattiasta, säästä voimia.",
        sets: makeSets(`${prefix}-sdl`, [
          { type: "speed", label: "Nopeusmaastaveto", reps: "3×1", weightKg: "140", targetRpe: "6.5" },
        ]),
      },
      {
        id: `${prefix}-skill`,
        name: "Käsilläseisonnat, vatsarullaukset, boksihypyt ja putkirullaukset",
        code: "SKILL",
        summary: "Kevyt kehonhallinta, keskivartalo, boksihypyt ja putkirullaukset",
        restMinutes: "2 min",
        cue: "Pidä tuntuma ja olkapäiden tuki ilman väsymystä.",
        sets: makeSets(`${prefix}-skill`, [
          { type: "skill", label: "Kierrokset", reps: "3", weightKg: "Kehonpaino", targetRpe: "6.0" },
        ]),
      },
      {
        id: `${prefix}-human-flag`,
        name: "Human Flag -harjoittelu (valinnainen)",
        code: "SKILL",
        summary: "Jos harjoittelit Human Flagia, kuittaa tehdyksi",
        restMinutes: "2 min",
        cue: "Kylkipito ja lapatuki – tehdään fiiliksen mukaan.",
        sets: makeSets(`${prefix}-hf`, [
          { type: "skill", label: "Human Flag", reps: "Valinnainen", weightKg: "Kehonpaino", targetRpe: "6.5" },
        ]),
      },
    ];
  }

  // Viikot 11 & 12: Treeni 3 jätetään kokonaan väliin (täysi lepo ennen testiviikkoa / palautuminen)
  if (cycle === 11 || cycle === 12) {
    return [
      {
        id: `${prefix}-rest`,
        name: "Treeni 3 jätetään kokonaan väliin (Täysi lepo)",
        code: "SKILL",
        summary: "Ei salitreeniä – täysi lepo ja latautuminen ennätystestiin",
        restMinutes: "-",
        cue: "Karsitaan väsymys kokonaan pois ennen H-hetkiä.",
        sets: makeSets(`${prefix}-rest`, [
          { type: "skill", label: "Täysi lepo / kevyt kävely", reps: "1", weightKg: "Lepo", targetRpe: "5.0" },
        ]),
      },
    ];
  }

  if (isDeload) {
    return [
      {
        id: `${prefix}-speed-dl`,
        name: "Nopeusmaastaveto (kevennetty)",
        code: "SPEED_DL",
        summary: "4 × 1 × 135 kg",
        restMinutes: "1 min",
        cue: "Maksimaalinen kiihtyvyys lattiasta, nolla väsymystä.",
        sets: makeSets(`${prefix}-sdl`, [
          { type: "speed", label: "Nopeusmaastaveto", reps: "4×1", weightKg: "135", targetRpe: "6.0" },
        ]),
      },
      {
        id: `${prefix}-skill`,
        name: "Käsilläseisonnat, vatsarullaukset, boksihypyt ja putkirullaukset (kevennetty)",
        code: "SKILL",
        summary: "Hallittu kehonhallinta, keskivartalo, boksihypyt ja putkirullaukset",
        restMinutes: "2 min",
        cue: "Pidä lavat aktiivisina ja keskivartalo tiukkana ilman uupumusta.",
        sets: makeSets(`${prefix}-skill`, [
          { type: "skill", label: "Kierrokset", reps: "3", weightKg: "Kehonpaino", targetRpe: "6.0" },
        ]),
      },
      {
        id: `${prefix}-human-flag`,
        name: "Human Flag -harjoittelu (valinnainen)",
        code: "SKILL",
        summary: "Jos harjoittelit Human Flagia, kuittaa tehdyksi",
        restMinutes: "2 min",
        cue: "Kylkipito ja lapatuki – tehdään fiiliksen mukaan.",
        sets: makeSets(`${prefix}-hf`, [
          { type: "skill", label: "Human Flag", reps: "Valinnainen", weightKg: "Kehonpaino", targetRpe: "6.5" },
        ]),
      },
    ];
  }

  const speedDlWeight = "140";
  return [
    {
      id: `${prefix}-speed-dl`,
      name: "Nopeusmaastaveto (RFD)",
      code: "SPEED_DL",
      summary: `8–10 × 1 × ${speedDlWeight} kg`,
      restMinutes: "1 min",
      cue: "Maksimaalinen irrotusnopeus alustasta ilman uupumusta.",
      sets: makeSets(`${prefix}-sdl`, [
        { type: "speed", label: "Nopeusmaastaveto", reps: "8×1", weightKg: speedDlWeight, targetRpe: "6.5" },
      ]),
    },
    {
      id: `${prefix}-skill`,
      name: "Käsilläseisonnat, vatsarullaukset, boksihypyt ja putkirullaukset",
      code: "SKILL",
      summary: "Kehonhallinta, keskivartalon nostot, vatsarullaukset, boksihypyt ja putkirullaukset",
      restMinutes: "2 min",
      cue: "Olkapäiden tuki, lapojen hallinta, maksimaalinen korsettipaine ja kimmoisuus.",
      sets: makeSets(`${prefix}-skill`, [
        { type: "skill", label: "Kierrokset", reps: "3", weightKg: "Kehonpaino", targetRpe: "7.0" },
      ]),
    },
    {
      id: `${prefix}-human-flag`,
      name: "Human Flag -harjoittelu (valinnainen)",
      code: "SKILL",
      summary: "Jos harjoittelit Human Flagia, kuittaa tehdyksi",
      restMinutes: "2 min",
      cue: "Kylkipito ja lapatuki – tehdään fiiliksen mukaan.",
      sets: makeSets(`${prefix}-hf`, [
        { type: "skill", label: "Human Flag", reps: "Valinnainen", weightKg: "Kehonpaino", targetRpe: "7.0" },
      ]),
    },
  ];
}

export const INITIAL_PROGRAM_WORKOUTS: ProgramWorkout[] = CYCLE_SPECS.flatMap(
  (spec) => {
    const c = spec.cycle;
    const w1Prefix = `c${c}-w1`;
    const w2Prefix = `c${c}-w2`;

    const workout1: ProgramWorkout = {
      id: `cycle-${c}-workout-1`,
      cycleNumber: c,
      workoutNumber: 1,
      phase: spec.phase,
      title:
        c === 12
          ? "Viikko 12 · Testipäivä 1 (A-päivä: DL + B + L ennätykset)"
          : c >= 9
          ? `Viikko ${c} · Treeni 1 (A-päivä)`
          : `Kierto ${c} · Treeni 1 (A-päivä)`,
      subtitle: "Pääveto, pääpenkki ja lisäpainoleuat",
      structureLabel: spec.structure,
      restDaysAfterMin: 2,
      restDaysAfterMax: 2,
      restBetweenSets: "3–5 min",
      coachNotes: spec.isDeload
        ? "Kevennyskierto: pidä jokainen toisto räjähtävänä ja teknisesti täydellisenä. Tarkoitus on huoltaa hermosto."
        : "Jätä pääsarjoihin 1–1,5 toistoa varaa (RPE ~8.5–9). Tämän treenin jälkeen pidetään 2 täyttä lepopäivää keskushermoston ja alaselän täydelliseen toipumiseen.",
      exercises: [
        {
          id: `${w1Prefix}-dl`,
          name: "Maastaveto (DL)",
          code: "DL",
          summary: spec.dlSummary,
          restMinutes: "4–5 min",
          cue: "Kiilaa itsesi tankoon, latsit tiukaksi ja terävä irrotus lattiasta. Jätä 1–1,5 toistoa varaa.",
          sets: makeSets(`${w1Prefix}-dl`, spec.dlSets),
        },
        {
          id: `${w1Prefix}-b`,
          name: "Penkkipunnerrus (B)",
          code: "B",
          summary: spec.benchSummary,
          restMinutes: "3–4 min",
          cue: "Vahva lapatuki ja jalkojen pito. Hallittu lasku, räjähtävä työntö.",
          sets: makeSets(`${w1Prefix}-b`, spec.benchSets),
        },
        {
          id: `${w1Prefix}-l`,
          name: "Lisäpainoleuanveto (L)",
          code: "L",
          summary: spec.pullSummary,
          restMinutes: "3–4 min",
          cue: "Jätetään 1–1,5 toistoa varaa. Aktiivinen roikunta pohjalla, leuka selkeästi tangon yli.",
          sets: makeSets(`${w1Prefix}-l`, spec.pullSets),
        },
      ],
    };

    const workout2: ProgramWorkout = {
      id: `cycle-${c}-workout-2`,
      cycleNumber: c,
      workoutNumber: 2,
      phase: spec.phase,
      title:
        c === 12
          ? "Viikko 12 · Testipäivä 2 (B-päivä: Etukyykyn ennätys)"
          : c >= 9
          ? `Viikko ${c} · Treeni 2 (B-päivä)`
          : `Kierto ${c} · Treeni 2 (B-päivä)`,
      subtitle:
        c <= 10
          ? "Etukyykky, volyymileuka ja nopeuspenkki"
          : "Etukyykky ja rajoille viety volyymileuka",
      structureLabel: spec.structure,
      restDaysAfterMin: 1,
      restDaysAfterMax: 2,
      restBetweenSets: "3–4 min",
      coachNotes:
        "Etukyykyssä jätetään 1–1,5 toistoa varaa. Volyymileuanvedossa 1 kova sarja rajoille asti (+15 kg n. 12–15 toistoa tai +20–22,5 kg n. 9–12 toistoa), paitsi kevennys- ja piikkauskierroilla 2–3 toistoa varaa! Nopeuspenkki tehdään fiiliksen mukaan.",
      exercises: [
        {
          id: `${w2Prefix}-s`,
          name: "Etukyykky (S)",
          code: "S",
          summary: spec.squatSummary,
          restMinutes: "3–4 min",
          cue: "Syvä keskivartalon paine, kyynärpäät korkealla ja terävä nousu pohjasta (1–1,5 toistoa varaa).",
          sets: makeSets(`${w2Prefix}-s`, spec.squatSets),
        },
        {
          id: `${w2Prefix}-vol-l`,
          name: "Volyymileuanveto (L)",
          code: "VOL_L",
          summary: spec.volPullSummary,
          restMinutes: "3 min",
          cue:
            spec.isDeload || c >= 9
              ? "Kevennys- ja piikkauskierroilla jätetään 2–3 toistoa varaa!"
              : "1 kova sarja rajoille asti päivän fiiliksen mukaan: joko +15 kg (n. 12–15 toistoa) tai +20–22,5 kg (n. 9–12 toistoa).",
          sets: makeSets(`${w2Prefix}-vol-l`, [
            {
              type: "work",
              label: "Volyymisarja",
              reps: spec.volPullReps,
              weightKg: spec.volPullWeight,
              targetRpe: spec.volPullRpe,
            },
          ]),
        },
        ...(c <= 10
          ? [
              {
                id: `${w2Prefix}-speed-b`,
                name: "Nopeuspenkki (kontrastiaalto)",
                code: "SPEED_B" as const,
                summary: spec.isDeload
                  ? "n. 4 × 3 × 60 kg"
                  : "8–10 sarjaa: 3–4×60 kg ↔ 1×70 kg vuorotellen",
                restMinutes: "1 min",
                cue: "70 kg ykkönen herättää motoriset yksiköt, jolloin 60 kg kolmonen/nelonen räjähtää ylös.",
                sets: makeSets(`${w2Prefix}-sb`, [
                  {
                    type: "speed",
                    label: "Nopeuspenkki",
                    reps: spec.isDeload ? "4×3" : "8 sarjaa",
                    weightKg: spec.isDeload ? "60" : "60 / 70",
                    targetRpe: "6.5",
                  },
                ]),
              },
            ]
          : []),
      ],
    };

    const workout3: ProgramWorkout = {
      id: `cycle-${c}-workout-3`,
      cycleNumber: c,
      workoutNumber: 3,
      phase: spec.phase,
      title:
        c === 11
          ? "Viikko 11 · Treeni 3 (Jätetään väliin – täysi lepo)"
          : c === 12
          ? "Viikko 12 · Palautuminen ja kehonhuolto"
          : c >= 9
          ? `Viikko ${c} · Treeni 3 (C-päivä)`
          : `Kierto ${c} · Treeni 3 (C-päivä)`,
      subtitle: "Nopeusmaastaveto, käsilläseisonta ja keskivartalo",
      structureLabel:
        c === 11 || c === 12
          ? "Täysi lepo ennen testiviikkoa"
          : spec.isDeload
          ? "Huoltava nopeusmaastaveto ja keskivartalo"
          : "Nopeusmaastaveto, käsilläseisonta, vatsat ja Human Flag",
      restDaysAfterMin: 1,
      restDaysAfterMax: 2,
      restBetweenSets: "1–2 min",
      coachNotes:
        c === 11
          ? "Treeni 3 jätetään kokonaan väliin. Täysi lepo ennen ennätysviikkoa."
          : "Nopeusmaastaveto, boksihypyt, käsilläseisonta ja vatsarullaukset/keskivartalon nostot sekä valinnainen Human Flag. Lepo 1–2 päivää ennen uuden kierron alkua.",
      exercises: buildSpeedDayExercises(c, spec.isDeload),
    };

    return [workout1, workout2, workout3];
  }
);
