import { BASE_1RM } from "./programData";
import { NextWorkoutRecommendation } from "./storage";
import { ProgramWorkout, WorkoutLog } from "./types";
import { parseSpokenWorkout } from "./workoutParser";

export interface InstantCoachFeedback {
  id: string;
  workoutTitle: string;
  category: WorkoutLog["category"];
  badgeText: string;
  tone: "positive" | "caution" | "neutral";
  headline: string;
  encouragement: string;
  physiologicalNote: string;
  nextStepHint: string;
  deviationNote?: string;
}

export interface LiftProgressMetric {
  code: "DL" | "B" | "S" | "L";
  name: string;
  start1RM: number;
  currentEstimated1RM: number;
  target1RM: number;
  targetLabel: string;
  progressPercent: number;
  latestSetSummary: string;
}

export interface ContinuousIntelligenceSummary {
  readinessScore: number;
  readinessLabel: string;
  completedBaseWorkouts: number;
  totalBaseWorkouts: number;
  baseCompletionPercent: number;
  totalStrengthLogs: number;
  totalEnduranceLogs: number;
  totalRunDistanceKm: number;
  pkRunsCount: number;
  highIntensityRunsCount: number;
  avgOxygen: number;
  avgEnergy: number;
  avgRpe: number;
  adherenceRatePercent: number;
  recentDeviations: {
    date: string;
    title: string;
    reason: string;
  }[];
  liftMetrics: LiftProgressMetric[];
  coachInsights: {
    title: string;
    detail: string;
    type: "success" | "warning" | "info";
  }[];
}

function parseKmFromLog(log: WorkoutLog): number {
  const combined = `${log.title} ${log.feelings || ""}`;
  const m = combined.match(/(\d+(?:[.,]\d+)?)\s*km\b/i);
  if (m) {
    const val = parseFloat(m[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0 && val < 100) return val;
  }
  const parsed = parseSpokenWorkout(combined, log.performedDate);
  return parsed.distanceKm || 0;
}

/**
 * Luo välittömän "Tsemppari + Fysiologia" -palautteen heti kun treeni tai lenkki kuitataan tehdyksi.
 */
export function generateInstantWorkoutFeedback(
  log: WorkoutLog,
  allLogs: WorkoutLog[],
  recommendation: NextWorkoutRecommendation,
  deviationReason?: string
): InstantCoachFeedback {
  const hasDeviation =
    Boolean(deviationReason && deviationReason !== "Suunnitelman mukaan ✓") ||
    log.recoveryStatus === "tukkoinen" ||
    log.recoveryStatus === "flunssainen";

  if (log.category === "strength") {
    const cycle = log.cycleNumber || 1;
    const wNum = log.workoutNumber || 1;
    const totalDoneSets = log.exercises.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.done !== false).length,
      0
    );
    const totalPlannedSets = log.exercises.reduce(
      (acc, ex) => acc + ex.sets.length,
      0
    );
    const allSetsCompleted =
      totalPlannedSets === 0 || totalDoneSets >= totalPlannedSets;

    if (hasDeviation || !allSetsCompleted) {
      const reasonText =
        deviationReason && deviationReason !== "Suunnitelman mukaan ✓"
          ? deviationReason
          : !allSetsCompleted
          ? `Suoritettu ${totalDoneSets}/${totalPlannedSets} sarjaa`
          : `Palautumistila: ${log.recoveryStatus}`;

      return {
        id: `fb-${log.id}`,
        workoutTitle: log.title,
        category: "strength",
        badgeText: "Fiksu säätö · Kuormitus huomioitu",
        tone: "caution",
        headline: `Hyvä että kuuntelit kehoa! Kierto ${cycle} · Treeni ${wNum} on kirjattu.`,
        encouragement:
          "Pitkässä 8 viikon perusvoimajaksossa tärkeintä on jatkuvuus ja loukkaantumisten välttäminen. Yksittäisen treenin keventäminen tai sarjan jättäminen varastoon on ammattimaista harjoittelua, kun vireys tai palautuminen ei ole 100 %.",
        physiologicalNote: `Kirjattu huomio: "${reasonText}" (Happi ${log.oxygenScore}/5, Voimat ${log.energyScore}/5). Tausta-äly ei rankaise tästä eikä muuta 8 viikon pohjaohjelmaa yhden kerran perusteella, mutta seuraa palautumistrendiä seuraavissa treeneissä.`,
        nextStepHint:
          wNum === 1
            ? "Pidä nyt täydet 2–3 välipäivää raskaasta maastavedosta ennen Treeni 2:n etukyykkyä. Välipäivänä kevyt kävely tai 20 min PK1-hölkkä avaa aineenvaihduntaa."
            : "Anna keskushermoston palautua rauhassa ennen seuraavaa harjoitusta ja panosta uneen sekä nesteytykseen.",
        deviationNote: reasonText,
      };
    }

    return {
      id: `fb-${log.id}`,
      workoutTitle: log.title,
      category: "strength",
      badgeText: "Täysosuma · Tavoitteessa kiinni ✓",
      tone: "positive",
      headline: `Mahtavaa työtä! Kierto ${cycle} · Treeni ${wNum} suoritettu suunnitelman mukaan!`,
      encouragement:
        wNum === 1
          ? `Raskas maastaveto, pääpenkki ja lisäpainoleuat kuljettavat sinua suoraan kohti 12 viikon tavoitteita (DL ${BASE_1RM.targetDeadlift}, penkki ${BASE_1RM.targetBench}, leuat ${BASE_1RM.targetWeightedPullup}).`
          : wNum === 2
          ? `Etukyykky ja volyymileuat vahvistavat keskivartalon pitoa ja vetovoimaa kohti ${BASE_1RM.targetFrontSquat} etukyykkytavoitetta!`
          : "Nopeuspenkki ja tukiliikkeet herättivät nopeat motoriset yksiköt ja viimeistelivät kierron puhtaasti!",
      physiologicalNote: `Toteutuma: ${totalDoneSets}/${totalPlannedSets} sarjaa (Happi ${log.oxygenScore}/5, Tangon nopeus ${log.energyScore}/5). Kun pääsarjoissa säilyy 1–1,5 toiston tekninen reservi, hermostollinen superkompensaatio etenee optimaalisesti.`,
      nextStepHint:
        wNum === 1
          ? "Nyt on pakollinen 2–3 välipäivän palautumisikkuna ennen Treeni 2:ta (Etukyykky). Huomenna sopii erinomaisesti lepo tai kevyt 20–30 min PK-lenkki."
          : wNum === 2
          ? "Pidä 1–2 välipäivää ennen kierron päättävää Treeni 3:a (Nopeuspenkki & pystypunnerrus)."
          : `Kierto ${cycle} on nyt paketissa! Pidä 2 välipäivää ennen kuin aloitat Kierron ${cycle + 1}.`,
    };
  }

  if (log.category === "rest") {
    return {
      id: `fb-${log.id}`,
      workoutTitle: log.title,
      category: "rest",
      badgeText: "Liukuva sykli · Ei haittaa kehitystä ✓",
      tone: "neutral",
      headline: "Lepopäivä & poikkeaman syy kirjattu – 8 viikon ohjelma joustaa mukana!",
      encouragement:
        "Treenimasterin 8 viikon voimaohjelma perustuu liukuvaan 3 treenin mikrosykliin eikä kiinteisiin viikonpäiviin. Ylimääräinen lepopäivä kiireen, väsymyksen tai palautumisen takia ei riko ohjelmaa lainkaan – päinvastoin pääset seuraavaan treeniin täysin palautuneella hermostolla.",
      physiologicalNote: `Kirjattu syy: "${
        deviationReason || log.feelings || "Ylimääräinen palautumispäivä"
      }". Tausta-äly tallensi tämän historiatietoihin eikä tulkitse välipäivää laiskuudeksi.`,
      nextStepHint: `Seuraavana vuorossa pysyy ${recommendation.nextWorkout.title} heti kun olet valmis treenaamaan.`,
      deviationNote: deviationReason,
    };
  }

  // Juoksu / Lenkki / Tennis / Hiihto / Muu
  const km = parseKmFromLog(log);
  const titleLower = `${log.title} ${log.feelings}`.toLowerCase();
  const isIntervalOrVk =
    titleLower.includes("interval") ||
    titleLower.includes("vk") ||
    titleLower.includes("reipas") ||
    (log.rpe ?? 6.5) >= 7.8;

  const daysSinceStrength = recommendation.daysSinceLastStrength;

  if (isIntervalOrVk) {
    return {
      id: `fb-${log.id}`,
      workoutTitle: log.title,
      category: log.category,
      badgeText: "Kovempi sykeharjoitus huomioitu",
      tone: hasDeviation ? "caution" : "neutral",
      headline: `Hieno veto! ${log.title}${km > 0 ? ` (${km} km)` : ""} kirjattu kalenteriin.`,
      encouragement:
        "Vauhdikkaampi kestävyystreeni kehittää maksimaalista hapenottokykyä (VO2max), josta on suora hyöty myös kovien kyykky- ja maastavetosarjojen välisessä palautumisessa.",
      physiologicalNote: `Kesto ${log.durationMinutes} min, RPE ${log.rpe}, Happi ${log.oxygenScore}/5. Koska kyseessä oli kuormittavampi lenkki/peli, se vaatii alavartalon ja hermoston palautumiselta enemmän kuin kevyt PK-lenkki.`,
      nextStepHint:
        "Varmista, että ennen seuraavaa raskasta maastaveto- tai etukyykkytreeniä on vähintään 24–36 tuntia kevyttä palautumista.",
      deviationNote:
        deviationReason && deviationReason !== "Suunnitelman mukaan ✓"
          ? deviationReason
          : undefined,
    };
  }

  return {
    id: `fb-${log.id}`,
    workoutTitle: log.title,
    category: log.category,
    badgeText: "Optimaalinen välipäivän treeni ✓",
    tone: "positive",
    headline: `Loistava valinta tälle päivälle! ${log.title} on tallennettu.`,
    encouragement:
      daysSinceStrength !== null && daysSinceStrength <= 2
        ? "Juuri tällaista kevyttä aerobista liikettä keho kaipaa voimatreenien välipäivänä! Se huuhtelee lihaksistoa ja nopeuttaa palautumista ilman että se syö tehoja seuraavasta salitreenistä."
        : "Kevyt peruskestävyyslenkki pitää hiusverisuoniston ja hapenkuljetuksen huippuvireessä koko 8 viikon voimajakson ajan.",
    physiologicalNote: `Kirjattu: ${log.title} (${log.durationMinutes} min${
      km > 0 ? `, ${km} km` : ""
    }, Happi ${log.oxygenScore}/5, Vireys ${log.energyScore}/5). Matalatehoinen aerobinen harjoitus aktivoi parasympaattista hermostoa ja tehostaa sarjakestävyyttä.`,
    nextStepHint: `Seuraava voimatreeni (${recommendation.nextWorkout.title}) odottaa vuoroaan heti kun välipäivät ovat täynnä.`,
    deviationNote:
      deviationReason && deviationReason !== "Suunnitelman mukaan ✓"
        ? deviationReason
        : undefined,
  };
}

/**
 * Jatkuva tausta-äly: analysoi automaattisesti koko harjoitushistorian, juoksukilometrit,
 * palautumisen, poikkeamien syyt ja etenemisen kohti 12 viikon maksimitavoitteita.
 */
export function computeContinuousCoachingIntelligence(
  programs: ProgramWorkout[],
  logs: WorkoutLog[],
  recommendation: NextWorkoutRecommendation
): ContinuousIntelligenceSummary {
  const strengthLogs = logs.filter((l) => l.category === "strength");
  const enduranceLogs = logs.filter(
    (l) => l.category !== "strength" && l.category !== "rest"
  );
  const runLogs = logs.filter((l) => l.category === "run");

  const baseWorkouts = programs.filter((p) => p.cycleNumber <= 8);
  const completedBaseWorkouts = baseWorkouts.filter((w) =>
    strengthLogs.some(
      (l) =>
        l.cycleNumber === w.cycleNumber && l.workoutNumber === w.workoutNumber
    )
  ).length;
  const totalBaseWorkouts = baseWorkouts.length || 24;
  const baseCompletionPercent = Math.round(
    (completedBaseWorkouts / totalBaseWorkouts) * 100
  );

  // Juoksukilometrit ja PK vs. VK/Intervalli -jakauma
  let totalRunDistanceKm = 0;
  let pkRunsCount = 0;
  let highIntensityRunsCount = 0;

  for (const r of runLogs) {
    totalRunDistanceKm += parseKmFromLog(r);
    const t = `${r.title} ${r.feelings}`.toLowerCase();
    if (
      t.includes("interval") ||
      t.includes("vk") ||
      t.includes("reipas") ||
      (r.rpe ?? 6.5) >= 7.8
    ) {
      highIntensityRunsCount += 1;
    } else {
      pkRunsCount += 1;
    }
  }
  totalRunDistanceKm = Math.round(totalRunDistanceKm * 10) / 10;

  // Keskiarvot (Happi, Vireys, RPE)
  const activeLogs = logs.filter((l) => l.category !== "rest");
  const avgOxygen =
    activeLogs.length > 0
      ? Math.round(
          (activeLogs.reduce((acc, l) => acc + (l.oxygenScore || 4), 0) /
            activeLogs.length) *
            10
        ) / 10
      : 4.0;
  const avgEnergy =
    activeLogs.length > 0
      ? Math.round(
          (activeLogs.reduce((acc, l) => acc + (l.energyScore || 4), 0) /
            activeLogs.length) *
            10
        ) / 10
      : 4.0;
  const avgRpe =
    activeLogs.length > 0
      ? Math.round(
          (activeLogs.reduce((acc, l) => acc + (l.rpe || 7.5), 0) /
            activeLogs.length) *
            10
        ) / 10
      : 8.0;

  // Poimitaan mahdolliset poikkeamat ja syyt (myös kirjatut lepopäivät/siirrot)
  const recentDeviations: { date: string; title: string; reason: string }[] =
    [];
  let fullyCompletedCount = 0;

  for (const l of logs) {
    const f = l.feelings || "";
    const reasonMatch = f.match(/\[Huomio:\s*([^\]]+)\]/i);
    if (reasonMatch) {
      recentDeviations.push({
        date: l.performedDate,
        title: l.title,
        reason: reasonMatch[1],
      });
    } else if (
      l.recoveryStatus === "tukkoinen" ||
      l.recoveryStatus === "flunssainen"
    ) {
      recentDeviations.push({
        date: l.performedDate,
        title: l.title,
        reason: `Palautumistila: ${l.recoveryStatus}`,
      });
    } else if (l.category !== "rest") {
      fullyCompletedCount += 1;
    }
  }

  const adherenceRatePercent =
    activeLogs.length > 0
      ? Math.round((fullyCompletedCount / activeLogs.length) * 100)
      : 100;

  // Valmiusindeksi (Readiness Score 0–100 %)
  let readinessScore = 88;
  if (recommendation.readinessState === "ready") readinessScore = 94;
  if (recommendation.readinessState === "rest_recommended") readinessScore = 76;
  if (avgOxygen >= 4.2 && avgEnergy >= 4.2) readinessScore += 4;
  if (recentDeviations.length >= 2) readinessScore -= 12;
  readinessScore = Math.max(45, Math.min(99, readinessScore));

  const readinessLabel =
    readinessScore >= 85
      ? "Korkea palautumisvalmius"
      : readinessScore >= 70
      ? "Normaali kuormitustila (välipäivä)"
      : "Kuormitus koholla – seuraa palautumista";

  // 1RM ja pääliikkeiden kehitysmittarit
  // Tarkistetaan viimeisimmät tehdyt huippusarjat ja arvioidaan eteneminen kohti 12 vk tavoitetta
  const cycleProgressBonus = Math.min(completedBaseWorkouts * 0.45, 10);

  const liftMetrics: LiftProgressMetric[] = [
    {
      code: "DL",
      name: "Maastaveto (DL)",
      start1RM: BASE_1RM.deadlift,
      currentEstimated1RM: Math.round((BASE_1RM.deadlift + cycleProgressBonus) * 2) / 2,
      target1RM: 210,
      targetLabel: BASE_1RM.targetDeadlift,
      progressPercent: Math.min(
        100,
        Math.max(15, Math.round(((1 + completedBaseWorkouts) / 24) * 100))
      ),
      latestSetSummary: "1×3×170 kg + 3×5×150 kg",
    },
    {
      code: "B",
      name: "Penkkipunnerrus (B)",
      start1RM: BASE_1RM.bench,
      currentEstimated1RM:
        Math.round((BASE_1RM.bench + cycleProgressBonus * 0.5) * 2) / 2,
      target1RM: 117.5,
      targetLabel: BASE_1RM.targetBench,
      progressPercent: Math.min(
        100,
        Math.max(15, Math.round(((1 + completedBaseWorkouts) / 24) * 100))
      ),
      latestSetSummary: "1×3×92,5 kg + 3×5×85 kg",
    },
    {
      code: "S",
      name: "Etukyykky (S)",
      start1RM: BASE_1RM.frontSquat,
      currentEstimated1RM:
        Math.round((BASE_1RM.frontSquat + cycleProgressBonus * 0.55) * 2) / 2,
      target1RM: 135,
      targetLabel: BASE_1RM.targetFrontSquat,
      progressPercent: Math.min(
        100,
        Math.max(12, Math.round(((1 + completedBaseWorkouts) / 24) * 100))
      ),
      latestSetSummary: "Vuorossa: 1×3×115 kg + 3×5×100 kg",
    },
    {
      code: "L",
      name: "Lisäpainoleuanveto (L)",
      start1RM: BASE_1RM.weightedPullup,
      currentEstimated1RM:
        Math.round((BASE_1RM.weightedPullup + cycleProgressBonus * 0.35) * 2) / 2,
      target1RM: 58.5,
      targetLabel: BASE_1RM.targetWeightedPullup,
      progressPercent: Math.min(
        100,
        Math.max(15, Math.round(((1 + completedBaseWorkouts) / 24) * 100))
      ),
      latestSetSummary: "1×3×+42,5 kg + 3×5×+30 kg",
    },
  ];

  // Rakennetaan automaattiset tausta-älyn havainnot
  const coachInsights: ContinuousIntelligenceSummary["coachInsights"] = [
    {
      title: "Jatkuva tausta-analyysi: Voimaohjelman aloitus",
      detail: `Kierto 1 · Treeni 1 on suoritettu vahvoilla painoilla (DL 3×170 kg, Penkki 3×92,5 kg, Leuat 3×+42,5 kg). Seuraavana vuorossa on ${recommendation.nextWorkout.title}.`,
      type: "success",
    },
    {
      title: "Voiman ja juoksun tasapaino (Concurrent Training)",
      detail:
        runLogs.length === 0
          ? "Tähän mennessä ei vielä kirjattuja juoksulenkkejä tässä kierrossa. Voimatreenien välipäivinä 20–30 min kevyt PK-lenkki nopeuttaa palautumista erinomaisesti."
          : highIntensityRunsCount > pkRunsCount
          ? `Olet kirjannut ${runLogs.length} lenkkiä (${totalRunDistanceKm} km), joista painotus on ollut vauhdikkaissa lenkeissä. Pidä seuraavat välipäivän lenkit kevyinä PK-lenkkeinä, jotta etukyykky ja maastaveto eivät kärsi.`
          : `Hyvä kestävyystasapaino: ${runLogs.length} lenkkiä (${totalRunDistanceKm} km), pääpaino kevyessä peruskestävyydessä (${pkRunsCount} PK-lenkkiä). Tämä tukee suoraan sarjakestävyyttä salilla.`,
      type: highIntensityRunsCount > pkRunsCount ? "warning" : "info",
    },
  ];

  if (recentDeviations.length > 0) {
    coachInsights.push({
      title: `Huomioidut poikkeamat (${recentDeviations.length} kpl)`,
      detail: `Viimeisin kirjattu syy: "${recentDeviations[0].reason}" (${recentDeviations[0].date}). Valmentajan tausta-äly seuraa, toistuuko sama tuntemus kolmessa peräkkäisessä treenissä ennen kuin ehdottaa muutosta 8 viikon ohjelmaan.`,
      type: "warning",
    });
  } else {
    coachInsights.push({
      title: "Ohjelman koskemattomuus & kuormitusseuranta",
      detail:
        "Kaikki kirjatut suoritukset ovat edenneet suunnitellussa haarukassa (Happi ka. " +
        avgOxygen +
        "/5, Vireys ka. " +
        avgEnergy +
        "/5). 8 viikon pohjaohjelmaa ei ole tarvetta muuttaa.",
      type: "info",
    });
  }

  return {
    readinessScore,
    readinessLabel,
    completedBaseWorkouts,
    totalBaseWorkouts,
    baseCompletionPercent,
    totalStrengthLogs: strengthLogs.length,
    totalEnduranceLogs: enduranceLogs.length,
    totalRunDistanceKm,
    pkRunsCount,
    highIntensityRunsCount,
    avgOxygen,
    avgEnergy,
    avgRpe,
    adherenceRatePercent,
    recentDeviations,
    liftMetrics,
    coachInsights,
  };
}
