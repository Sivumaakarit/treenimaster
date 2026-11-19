import { RecoveryStatus, SportCategory, WorkoutLog } from "./types";

export interface ParsedWorkoutSummary {
  shouldLog: boolean;
  category: SportCategory;
  workoutType: string; // esim. "Kevyt PK", "Intervalli / vedot", "Reipas VK", "Palauttava"
  distanceKm: number | null;
  durationMinutes: number;
  rpe: number;
  oxygenScore: number;
  energyScore: number;
  recoveryStatus: RecoveryStatus;
  performedDate: string;
  standardizedTitle: string;
  structuredFeelings: string;
}

const FINNISH_NUMBER_WORDS: Record<string, number> = {
  yksi: 1,
  yhden: 1,
  kaksi: 2,
  kahden: 2,
  pari: 2,
  kolme: 3,
  kolmen: 3,
  neljä: 4,
  neljän: 4,
  viisi: 5,
  viiden: 5,
  kuusi: 6,
  kuuden: 6,
  seitsemän: 7,
  kahdeksan: 8,
  yhdeksän: 9,
  kymmenen: 10,
  kympin: 10,
  puolitoista: 1.5,
};

function shiftDateISO(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, (d || 1) + deltaDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatStandardWorkoutTitle(params: {
  category: SportCategory;
  workoutType?: string;
  distanceKm?: number | null;
  durationMinutes?: number | null;
}): string {
  const { category, workoutType, distanceKm, durationKmFormatted, durationMinutes } = {
    ...params,
    durationKmFormatted:
      typeof params.distanceKm === "number" && params.distanceKm > 0
        ? `${String(params.distanceKm).replace(".", ",")} km`
        : null,
  };

  if (category === "rest") {
    return "Lepopäivä · Hermoston palautuminen";
  }

  const baseLabel: Record<SportCategory, string> = {
    run: "Juoksu",
    tennis: "Tennis",
    ski: "Hiihto",
    strength: "Voimatreeni",
    other: "Muu treeni",
    rest: "Lepopäivä",
  };

  const parts: string[] = [];
  if (workoutType && workoutType.trim()) {
    parts.push(`${baseLabel[category]} (${workoutType.trim()})`);
  } else {
    parts.push(baseLabel[category]);
  }

  if (durationKmFormatted) {
    parts.push(durationKmFormatted);
  }

  if (typeof durationMinutes === "number" && durationMinutes > 0) {
    parts.push(`${durationMinutes} min`);
  }

  return parts.join(" · ");
}

export function parseSpokenWorkout(
  rawText: string,
  todayISO: string
): ParsedWorkoutSummary {
  const cleaned = rawText.trim();
  const lower = cleaned.toLowerCase();

  // 1. Laji
  let category: SportCategory = "run";
  let hasActivityKeyword = false;

  if (
    /(juoks|lenkki|lenkil|aamulenk|iltalenk|hölkk|intervall|vedot|vetoja|pk-lenk|vk-lenk|kilsa|kilometri)/i.test(
      lower
    )
  ) {
    category = "run";
    hasActivityKeyword = true;
  } else if (/(tenni|nelinpeli|kaksinpeli|pallottel|padel)/i.test(lower)) {
    category = "tennis";
    hasActivityKeyword = true;
  } else if (/(sulkapallo|sulkis)/i.test(lower)) {
    category = "other";
    hasActivityKeyword = true;
  } else if (/(golf|kierros golfia|rangella)/i.test(lower)) {
    category = "other";
    hasActivityKeyword = true;
  } else if (/(hiihd|hiiht|ladul|luisteluhiih|perinteis)/i.test(lower)) {
    category = "ski";
    hasActivityKeyword = true;
  } else if (/(lepopäivä|pidin lepoa|täysi lepo|huilipäivä)/i.test(lower)) {
    category = "rest";
    hasActivityKeyword = true;
  } else if (
    /(kävel|pyöräil|kuntopyör|uinti|uimassa|kehonhuolto|venyttely|liikkuvuus)/i.test(
      lower
    )
  ) {
    category = "other";
    hasActivityKeyword = true;
  }

  // 2. Päivämäärä
  let performedDate = todayISO;
  if (lower.includes("toissapäivänä")) {
    performedDate = shiftDateISO(todayISO, -2);
  } else if (lower.includes("eilen") || lower.includes("eilinen")) {
    performedDate = shiftDateISO(todayISO, -1);
  }

  // 3. Treenin tyyppi / tehoalue
  let workoutType = "Kevyt PK";
  if (category === "run") {
    if (/(tabata)/i.test(lower)) {
      workoutType = "Intervalli / Tabata";
    } else if (/(intervall|veto|vetoja|spurt|mäkived|hiit|kovat vedot|kiihdytys)/i.test(lower)) {
      workoutType = "Intervalli";
    } else if (/(reipas|vk|vauhtikestävyys|kova lenkki|kovavauhti)/i.test(lower)) {
      workoutType = "Reipas VK";
    } else if (/(palauttava|erittäin kevyt|kevyt hölkkä)/i.test(lower)) {
      workoutType = "Palauttava PK1";
    } else if (/(kevyt|kevyellä|pk|peruskestävyys|rauhallinen|matalalla sykkeellä)/i.test(lower)) {
      workoutType = "Kevyt PK";
    } else {
      workoutType = "PK-lenkki";
    }
  } else if (category === "tennis") {
    if (lower.includes("nelinpeli")) workoutType = "Nelinpeli";
    else if (lower.includes("kaksinpeli")) workoutType = "Kaksinpeli";
    else if (lower.includes("padel")) workoutType = "Padel";
    else workoutType = "Pelit & pallottelu";
  } else if (category === "ski") {
    if (lower.includes("luistelu") || lower.includes("vapaa"))
      workoutType = "Vapaa / luistelu";
    else if (lower.includes("perintei")) workoutType = "Perinteinen";
    else workoutType = "PK-hiihto";
  } else if (category === "other") {
    if (lower.includes("sulkapallo") || lower.includes("sulkis"))
      workoutType = "Sulkapallo";
    else if (lower.includes("golf") || lower.includes("range"))
      workoutType = "Golf";
    else if (lower.includes("kävel")) workoutType = "Kävelylenkki";
    else if (lower.includes("pyörä")) workoutType = "Pyöräily";
    else workoutType = "Huoltava harjoitus";
  } else if (category === "rest") {
    workoutType = "Palautuminen";
  }

  // 4. Matka (km)
  let distanceKm: number | null = null;
  const kmRegex = /(\d+(?:[.,]\d+)?)\s*(km|kilometriä|kilometrin|kilsaa|kilsan)\b/i;
  const kmMatch = lower.match(kmRegex);
  if (kmMatch) {
    const val = parseFloat(kmMatch[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0 && val < 100) {
      distanceKm = Math.round(val * 10) / 10;
    }
  } else {
    // Tarkista sanalliset kilometrit, esim. "viisi kilometriä" tai "viiden kilsan lenkki"
    for (const [word, num] of Object.entries(FINNISH_NUMBER_WORDS)) {
      const wordKmRegex = new RegExp(
        `\\b${word}\\s*(km|kilometriä|kilometrin|kilsaa|kilsan)\\b`,
        "i"
      );
      if (wordKmRegex.test(lower)) {
        distanceKm = num;
        break;
      }
    }
  }

  // 5. Kesto (min)
  let durationMinutes = category === "rest" ? 0 : 25;
  const minMatch = lower.match(/(\d+)\s*(min|minuuttia|minuutin|minsa)/i);
  const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(tuntia|tunti|h\b)/i);

  if (minMatch) {
    durationMinutes = parseInt(minMatch[1], 10);
  } else if (hourMatch) {
    durationMinutes = Math.round(
      parseFloat(hourMatch[1].replace(",", ".")) * 60
    );
  } else if (lower.includes("puolitoista tuntia")) {
    durationMinutes = 90;
  } else if (lower.includes("tunnin") || lower.includes("tunti")) {
    durationMinutes = 60;
  } else if (lower.includes("puoli tuntia") || lower.includes("puolen tunnin")) {
    durationMinutes = 30;
  } else if (lower.includes("vartin") || lower.includes("vartti")) {
    durationMinutes = 15;
  } else if (distanceKm && category === "run") {
    // Jos sanottiin vain km (esim. "5 km lenkki"), arvioi kesto vauhdin mukaan
    const paceMinPerKm =
      workoutType === "Intervalli" || workoutType === "Reipas VK" ? 5.0 : 5.8;
    durationMinutes = Math.round(distanceKm * paceMinPerKm);
  }

  // 6. Kuormitus (RPE), happi ja vire
  let rpe =
    workoutType === "Intervalli"
      ? 8.0
      : workoutType === "Reipas VK"
      ? 7.5
      : workoutType.includes("Kevyt") || workoutType.includes("Palauttava")
      ? 5.5
      : 6.5;

  let oxygenScore = 4;
  let energyScore = 4;
  let recoveryStatus: RecoveryStatus = "normaali";

  if (
    /(happi kulki|hyvin kulki|kevyesti|lentokeli|erinomai|vahva|helppo|kevyellä sykkeellä|jaksoin hyvin)/i.test(
      lower
    )
  ) {
    oxygenScore = 5;
    energyScore = 5;
    recoveryStatus = "erinomainen";
  } else if (
    /(tukkoi|raskas|väsy|hapotti|painoi|jumissa|jäykkä)/i.test(lower)
  ) {
    oxygenScore = 2;
    energyScore = 2;
    recoveryStatus = "tukkoinen";
    rpe = Math.max(rpe, 8.0);
  } else if (/(flunssa|nuha|kurkku|räkä|kuume|aivastel)/i.test(lower)) {
    oxygenScore = 2;
    energyScore = 2;
    recoveryStatus = "flunssainen";
  }

  const standardizedTitle = formatStandardWorkoutTitle({
    category,
    workoutType,
    distanceKm,
    durationMinutes,
  });

  // 7. Vakioitu yhteenvetoteksti (kirjataan vain mitä käyttäjä oikeasti sanoi selkosuomeksi + matka km)
  const cleanUserSentence = cleanSpokenToSelkosuomi(cleaned);
  const kmPrefix = distanceKm
    ? `Matka: ${String(distanceKm).replace(".", ",")} km. `
    : "";
  const structuredFeelings = `${kmPrefix}${cleanUserSentence}`.trim();

  return {
    shouldLog: hasActivityKeyword,
    category,
    workoutType,
    distanceKm,
    durationMinutes,
    rpe,
    oxygenScore,
    energyScore,
    recoveryStatus,
    performedDate,
    standardizedTitle,
    structuredFeelings,
  };
}

/**
 * Poimii kilometrimäärän (km) mistä tahansa WorkoutLog-merkinnästä (otsikosta tai tekstistä).
 */
export function extractDistanceKmFromLog(log: WorkoutLog): number | null {
  if (log.category === "strength" || log.category === "rest") {
    return null;
  }
  const combined = `${log.title || ""} ${log.feelings || ""}`;
  const m = combined.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometriä|kilsaa)\b/i);
  if (m) {
    const val = parseFloat(m[1].replace(",", "."));
    if (!Number.isNaN(val) && val > 0 && val < 300) {
      return Math.round(val * 100) / 100;
    }
  }
  return null;
}

/**
 * Päivittää tai lisää kilometrimäärän (esim. Withings-sovelluksesta katsotun km-lukeman)
 * suoraan suorituksen otsikkoon ja yhteenvetoon.
 */
export function applyDistanceKmToTitleAndFeelings(
  title: string,
  feelings: string,
  kmString: string
): { title: string; feelings: string } {
  const trimmed = kmString.trim().replace(",", ".");
  const kmNum = trimmed ? parseFloat(trimmed) : null;
  const validKm =
    kmNum !== null && !Number.isNaN(kmNum) && kmNum > 0
      ? Math.round(kmNum * 100) / 100
      : null;
  const kmFormatted = validKm ? `${String(validKm).replace(".", ",")} km` : "";

  // 1. Päivitetään otsikko: poistetaan mahdollinen vanha "· X,X km" ja lisätään uusi ennen kestoa tai loppuun
  let cleanTitle = title
    .replace(/\s*·\s*\d+(?:[.,]\d+)?\s*km\b/gi, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*km\s*·\s*/gi, "")
    .trim();

  if (validKm) {
    if (/\s*·\s*\d+\s*min\b/i.test(cleanTitle)) {
      cleanTitle = cleanTitle.replace(
        /(\s*·\s*\d+\s*min\b)/i,
        ` · ${kmFormatted}$1`
      );
    } else {
      cleanTitle = `${cleanTitle} · ${kmFormatted}`;
    }
  }

  // 2. Päivitetään tekstikentän Matka-merkintä
  let cleanFeelings = feelings
    .replace(/Matka:\s*\d+(?:[.,]\d+)?\s*km\s*(?:·|\.)?\s*/gi, "")
    .trim();

  if (validKm) {
    cleanFeelings = cleanFeelings
      ? `Matka: ${kmFormatted}. ${cleanFeelings}`
      : `Matka: ${kmFormatted}.`;
  }

  return { title: cleanTitle, feelings: cleanFeelings };
}

export interface ParsedFeelingsSelkosuomi {
  selkosuomiText: string;
  oxygenScore: number;
  energyScore: number;
  recoveryStatus: RecoveryStatus;
  suggestedDeviationChip: string;
}

/**
 * Siistii puhekielisen sanelun välittömästi selkeäksi yleiskieleksi (selkosuomeksi)
 * ennen Supabaseen tallennusta.
 */
export function cleanSpokenToSelkosuomi(rawSpeech: string): string {
  if (!rawSpeech || !rawSpeech.trim()) return "";

  let text = rawSpeech.trim();

  // Poistetaan alun puhekieliset aloitussanat ("Joo", "No", "Elikkä", "Tota")
  text = text.replace(
    /^(joo+|noo?|eli|elikkä|tota|tuota|hei|okei|noniin|no niin)[,\s]+/i,
    ""
  );

  // Siistitään tyypilliset puhekieliset rakenteet yleiskieleksi
  text = text
    .replace(
      /\b(tein tänään semmosen|tein semmosen|kävin tekemässä semmosen|vedin tänään semmosen)\b/gi,
      "Suoritettu"
    )
    .replace(
      /\b(tota noin|tuota noin|tota|tuota|niinku|niin sanotusti|sillee|vähän niinku|tai semmonen|semmonen|semmosen|tämmönen|tämmösen|öö+|ää+|hmm+)\b/gi,
      " "
    )
    .replace(/\b(siin oli|siinä oli)\b/gi, "mukana")
    .replace(/\b(ja sitte|ja sit|sitte|sit)\b/gi, "sekä")
    .replace(/\b(mä)\b/gi, "")
    .replace(/\b(mul oli|mulla oli)\b/gi, "oli")
    .replace(/\b( mut | mutta ku )\b/gi, ", mutta ")
    .replace(/\b(et |että ku )\b/gi, "että ")
    .replace(/\b(ihan ok|ihan okei|ihan jees)\b/gi, "hyvin")
    .replace(/\b(tosi hyvin)\b/gi, "erinomaisesti")
    .replace(/\b(kilsaa|kilsan|kilometriä)\b/gi, "km")
    .replace(/\b(minsaa|minsan|minuuttia)\b/gi, "min")
    .replace(/\b(minuutti ja 15)\b/gi, "1 min 15 s palautus")
    .replace(/\b(minuutin kiihdytys)\b/gi, "1 min kiihdytys")
    .replace(/\b(kiloo|kilon)\b/gi, "kg")
    .replace(/\b(aamulenkin)\b/gi, "aamulenkki")
    .replace(/\b(iltalenkin)\b/gi, "iltalenkki")
    .replace(/\bhf\b/gi, "Human Flag")
    .replace(/\bkumminauha/gi, "kuminauha")
    .replace(/\b(mawe|mave)\b/gi, "maastaveto")
    .replace(/\bpena\b/gi, "penkkipunnerrus")
    .replace(/\betari\b/gi, "etukyykky")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();

  // Muunnetaan alkukirjain isoksi ja varmistetaan piste lopussa
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) {
      text += ".";
    }
  }

  return text;
}

/**
 * Tarkistaa ja siistii vanhan tai puhekielisen WorkoutLog-merkinnän selkosuomeksi
 * (sekä otsikon että tuntemukset), jotta Supabasessa ja näkymissä ei näy raakaa puhekieltä.
 */
export function sanitizeWorkoutLogToSelkosuomi(log: WorkoutLog): {
  log: WorkoutLog;
  changed: boolean;
} {
  if (log.category === "strength") {
    return { log, changed: false };
  }

  const rawFeelings = log.feelings || "";
  const hasColloquialSpeech =
    /\b(joo|semmosen|semmonen|tämmönen|niinku|tota|sitte|siin oli|Sanelu:)\b/i.test(
      rawFeelings
    ) || log.title === "Aamulenkki";

  if (!hasColloquialSpeech) {
    return { log, changed: false };
  }

  const parsed = parseSpokenWorkout(
    `${log.title} ${rawFeelings}`,
    log.performedDate
  );
  const newTitle =
    log.title === "Aamulenkki" || log.title === "Juoksulenkki"
      ? parsed.standardizedTitle
      : log.title;

  const cleanedFeelings = rawFeelings.includes("Tyyppi:")
    ? rawFeelings
        .replace(/Sanelu:\s*"([^"]+)"/i, (_, inner) => {
          return `Yhteenveto: ${cleanSpokenToSelkosuomi(inner)}`;
        })
        .replace(/Yhteenveto:\s*"([^"]+)"/i, (_, inner) => {
          return `Yhteenveto: ${cleanSpokenToSelkosuomi(inner)}`;
        })
    : parsed.structuredFeelings;

  return {
    log: {
      ...log,
      title: newTitle,
      feelings: cleanedFeelings,
    },
    changed: newTitle !== log.title || cleanedFeelings !== log.feelings,
  };
}

/**
 * Jäsentää sanelun ("Miten treeni meni / miten happi ja voimat riittivät?")
 * selkosuomeksi JA poimii siitä automaattisesti Happi (1–5), Voimat (1–5),
 * Palautumistilan ja Poikkeaman syyn.
 */
export function parseSpokenFeelingsToSelkosuomi(
  rawSpeech: string,
  mode: "strength" | "run" | "skip" = "strength"
): ParsedFeelingsSelkosuomi {
  const lower = rawSpeech.toLowerCase();
  const cleanedSentence = cleanSpokenToSelkosuomi(rawSpeech);

  let oxygenScore = 4;
  let energyScore = 4;
  let recoveryStatus: RecoveryStatus = "normaali";
  let suggestedDeviationChip =
    mode === "skip"
      ? "Työkiireet / aikapula"
      : "Suunnitelman mukaan ✓";

  // Happi
  if (
    /(happi kulki tosi hyvin|happi kulki erinomaisesti|happi kulki hyvin|kevyesti|ei hengästyttänyt|hyvä happi)/i.test(
      lower
    )
  ) {
    oxygenScore = 5;
  } else if (
    /(happi loppui|hengästytti|raskas hengittää|tukkoista hengittää|hapotti)/i.test(
      lower
    )
  ) {
    oxygenScore = 2;
  } else if (/(happi ihan ok|happi kulki ok|normaalisti)/i.test(lower)) {
    oxygenScore = 4;
  }

  // Voimat & tangon nopeus
  if (
    /(voimat riitti|terävä|rauta oli kevyttä|nousi kevyesti|vahva olo|hyvin voimaa|tangon nopeus hyvä)/i.test(
      lower
    )
  ) {
    energyScore = 5;
    recoveryStatus = "erinomainen";
  } else if (
    /(painoi|raskasta|voimat vähissä|ei kulkenut|väsynyt|tukkoinen|tiukka)/i.test(
      lower
    )
  ) {
    energyScore = 2;
    recoveryStatus = "tukkoinen";
  }

  // Poikkeaman syy
  if (/(alaselkä|selkä|polvi|olkapää|nivel|jumissa|kiristi)/i.test(lower)) {
    recoveryStatus = "tukkoinen";
    suggestedDeviationChip =
      mode === "skip"
        ? "Alaselkä tai jalat vielä palautumassa"
        : mode === "run"
        ? "Jalat hieman raskaat salista"
        : "Alaselkä / nivelet varovasti";
  } else if (/(kiire|aikapula|ei ehtinyt|lyhyt aika|töissä)/i.test(lower)) {
    suggestedDeviationChip =
      mode === "skip"
        ? "Työkiireet / aikapula"
        : mode === "run"
        ? "Aikapula – lyhyempi suoritus"
        : "Aikapula – tiivistetty treeni";
  } else if (/(huonot unet|nukuin huonosti|väsymys|univelka)/i.test(lower)) {
    recoveryStatus = "tukkoinen";
    suggestedDeviationChip =
      mode === "skip"
        ? "Väsymys / huonot unet"
        : mode === "run"
        ? "Tukkoisuutta / huonot unet"
        : "Huonot unet / palautuminen vajaa";
  } else if (/(flunssa|nuha|kurkku kipeä|kipeä)/i.test(lower)) {
    recoveryStatus = "flunssainen";
    suggestedDeviationChip =
      mode === "skip"
        ? "Flunssainen olo / nuha"
        : "Huonot unet / palautuminen vajaa";
  } else if (/(painoi|tukkoinen|raskas)/i.test(lower)) {
    suggestedDeviationChip =
      mode === "run"
        ? "Jalat hieman raskaat salista"
        : "Painoi / hieman tukkoinen";
  }

  return {
    selkosuomiText: cleanedSentence,
    oxygenScore,
    energyScore,
    recoveryStatus,
    suggestedDeviationChip,
  };
}
