import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import {
  ExercisePlan,
  ProgramModificationProposal,
  ProgramWorkout,
  RecoveryStatus,
  SportCategory,
  WorkoutLog,
} from "@/lib/types";
import { parseSpokenWorkout } from "@/lib/workoutParser";

function loadKnowledgeDocs(): string {
  try {
    const baseDocPath = path.join(process.cwd(), "docs", "treenimaster-pohja.md");
    const notebookDocPath = path.join(
      process.cwd(),
      "docs",
      "notebook-lahteet.md"
    );
    const baseDoc = fs.existsSync(baseDocPath)
      ? fs.readFileSync(baseDocPath, "utf-8")
      : "";
    const notebookDoc = fs.existsSync(notebookDocPath)
      ? fs.readFileSync(notebookDocPath, "utf-8")
      : "";
    return `${baseDoc}\n\n---\n\n${notebookDoc}`;
  } catch {
    return "";
  }
}

function shiftISODate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DetectedWorkoutPayload {
  shouldLog: boolean;
  category?: SportCategory;
  title?: string;
  performedDate?: string;
  durationMinutes?: number;
  rpe?: number;
  feelings?: string;
  oxygenScore?: number;
  energyScore?: number;
  recoveryStatus?: RecoveryStatus;
}

function fallbackExtractWorkout(
  message: string,
  todayISO: string
): DetectedWorkoutPayload {
  const lower = message.toLowerCase();

  const isQuestionOnly =
    lower.endsWith("?") &&
    !lower.includes("juoksin") &&
    !lower.includes("kävin") &&
    !lower.includes("pelasin") &&
    !lower.includes("hiihdin") &&
    !lower.includes("tein") &&
    !lower.includes("treenasin");

  if (isQuestionOnly) {
    return { shouldLog: false };
  }

  const parsed = parseSpokenWorkout(message, todayISO);
  if (!parsed.shouldLog) {
    return { shouldLog: false };
  }

  return {
    shouldLog: true,
    category: parsed.category,
    title: parsed.standardizedTitle,
    performedDate: parsed.performedDate,
    durationMinutes: parsed.durationMinutes,
    rpe: parsed.rpe,
    feelings: parsed.structuredFeelings,
    oxygenScore: parsed.oxygenScore,
    energyScore: parsed.energyScore,
    recoveryStatus: parsed.recoveryStatus,
  };
}

function buildFallbackCoachReply(
  userMessage: string,
  detected: DetectedWorkoutPayload,
  nextWorkout: ProgramWorkout | undefined,
  logs: WorkoutLog[]
): {
  reply: string;
  proposal: ProgramModificationProposal | null;
} {
  const recent7d = logs.slice(0, 6);
  const aerobicCount = recent7d.filter((l) =>
    ["run", "tennis", "ski"].includes(l.category)
  ).length;
  const sluggishCount = recent7d.filter(
    (l) => l.recoveryStatus === "tukkoinen" || l.recoveryStatus === "flunssainen"
  ).length;

  let proposal: ProgramModificationProposal | null = null;

  // Jos käyttäjä pyytää kevennystä tai pitkän aikavälin kuorma on selvästi tukkoinen, tee ehdotus (ei automaattista muutosta!)
  if (
    nextWorkout &&
    (sluggishCount >= 2 ||
      /(kevennä|muuta ohjelmaa|alaselkä jumissa|liikaa kuormaa|palautuminen sakkaa)/i.test(
        userMessage
      ))
  ) {
    const adjustedExercises: ExercisePlan[] = nextWorkout.exercises.map((ex) => ({
      ...ex,
      summary: `${ex.summary} (Kevennetty ehdotus -5 %)`,
      sets: ex.sets.map((s) => {
        const num = parseFloat(s.weightKg.replace("+", ""));
        if (Number.isNaN(num) || num <= 0) return s;
        const prefix = s.weightKg.startsWith("+") ? "+" : "";
        const reduced = Math.round((num * 0.95) / 2.5) * 2.5;
        return {
          ...s,
          weightKg: `${prefix}${reduced}`,
          actualWeightKg: `${prefix}${reduced}`,
          targetRpe: "7.5",
        };
      }),
    }));

    proposal = {
      id: `prop-${Date.now()}`,
      targetWorkoutId: nextWorkout.id,
      cycleNumber: nextWorkout.cycleNumber,
      workoutNumber: nextWorkout.workoutNumber,
      reason:
        "Useamman suorituksen palautumistuntemuksissa näkyy kumulatiivista kuormaa. Pieni 5 % kuormankevennys turvaa liikenopeuden (RFD) ja keskushermoston palautumisen.",
      summary: `Kevennä harjoituksen ${nextWorkout.title} työsarjojen kuormia ~5 % yhden kierron ajaksi`,
      updatedExercises: adjustedExercises,
    };
  }

  if (detected.shouldLog && detected.category) {
    const catNames: Record<SportCategory, string> = {
      run: "Juoksulenkki",
      tennis: "Tennisharjoitus",
      ski: "Hiihtolenkki",
      strength: "Voimaharjoitus",
      other: "Harjoitus",
      rest: "Lepopäivä",
    };

    const nextInfo = nextWorkout
      ? `Seuraavana voimaohjelmassa odottaa **${nextWorkout.title}** (${nextWorkout.structureLabel}).`
      : "";

    let physioAnalysis = "";
    if (detected.category === "run" && (detected.durationMinutes ?? 0) <= 35) {
      physioAnalysis =
        "Fysiologinen arvio: Lyhyt, matalasykkeinen lenkki (20–30 min PK1) toimii erinomaisena aktiivisena palautteluna. Se lisää hiussuonitusta ja parasympaattista hermoston virettä ilman, että se syö etukyykyn tai maastavedon räjähtävää voimantuottonopeutta (RFD).";
    } else if (detected.category === "tennis") {
      physioAnalysis =
        "Fysiologinen arvio: Tennis sisältää teräviä suunnanmuutoksia, jarrutuksia ja elastista iskutusta pohkeille sekä polville. Hienoa, että happi kulki ja jaksaminen oli korkealla! Huomioidaan kuitenkin, että tunnin tennispeli kuormittaa alavartalon jänteitä – pidä huoli, että ennen seuraavaa raskasta maastavetoa tai etukyykkyä jalat ovat täysin tuoreet.";
    } else if (detected.category === "ski") {
      physioAnalysis =
        "Fysiologinen arvio: Hiihto kuormittaa kokonaisvaltaisesti sekä ylävartalon vetäviä lihaksia (latsit) että lantion ojennusta. Pidä riittävä väli ennen raskaita lisäpainoleukoja ja maastavetoa.";
    } else {
      physioAnalysis =
        "Fysiologinen arvio: Suoritus ja tuntemukset on tallennettu pitkän aikavälin kuormitusseurantaan.";
    }

    const trendNote =
      aerobicCount >= 3
        ? "\n\n**Pitkän aikavälin trendihuomio:** Viimeisen 7 päivän aikana aerobisia/pallopelisuorituksia on kertynyt jo useita. Pidän 8 viikon voimaohjelman ennallaan, mutta seuraan tarkasti, ettei kokonaiskuorma ala hidastaa tangon irrotusnopeutta."
        : "\n\n**Pitkän aikavälin trendi:** Kokonaiskuormitus ja aerobisen harjoittelun määrä ovat tällä hetkellä hyvin tasapainossa 8 kierron voimaohjelman kanssa – 8 viikon perusohjelmaan ei ole tarvetta koskea.";

    return {
      reply: `**Kirjattu automaattisesti kalenteriin ja Supabaseen:** ${catNames[detected.category]} – **${detected.title}** (${detected.performedDate}), tuntemus: *${detected.recoveryStatus}*.\n\n${physioAnalysis}${trendNote}\n\n${nextInfo}`,
      proposal,
    };
  }

  return {
    reply: `Analysoin tilannettasi 8 kierron aaltoperusvoimaohjelman ja NotebookLM-tietopohjan (METD & hermostollinen palautuminen) kautta.\n\nNykyinen tilanne:\n- **Seuraava voimatreeni:** ${nextWorkout ? `${nextWorkout.title} (${nextWorkout.structureLabel})` : "Kierto 1 · Treeni 1"}\n- **Viimeisen 7 pv aerobiset suoritukset:** ${aerobicCount} kpl\n\nMuista perussääntömme: emme hötkyile yksittäisestä päivästä emmekä muuta 8 viikon voimaohjelmaa automaattisesti. Pääsarjoissa pidetään 1–1,5 toiston tekninen reservi (RPE 8.5–9), ja Treeni 1:n (raskas maastaveto + penkki + lisäpainoleuat) jälkeen pidetään poikkeuksetta **2–3 täyttä lepopäivää** ennen etukyykkyä.`,
    proposal,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      todayISO,
      nextWorkout,
      recentLogs = [],
      chatHistory = [],
      customApiKey,
    }: {
      message: string;
      todayISO: string;
      nextWorkout?: ProgramWorkout;
      recentLogs?: WorkoutLog[];
      chatHistory?: Array<{ role: string; content: string }>;
      customApiKey?: string;
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Viesti puuttuu." },
        { status: 400 }
      );
    }

    const fallbackDetected = fallbackExtractWorkout(message, todayISO);
    const apiKey =
      (customApiKey && customApiKey.trim()) ||
      process.env.GEMINI_API_KEY ||
      "";

    if (
      !apiKey ||
      apiKey === "PLACEHOLDER_API_KEY" ||
      apiKey === "SINUN_GEMINI_API_AVAIN"
    ) {
      const fb = buildFallbackCoachReply(
        message,
        fallbackDetected,
        nextWorkout,
        recentLogs
      );
      return NextResponse.json({
        reply: fb.reply,
        detectedWorkout: fallbackDetected.shouldLog ? fallbackDetected : null,
        programProposal: fb.proposal,
      });
    }

    const knowledgeBase = loadKnowledgeDocs();
    const recentLogsSummary = recentLogs
      .slice(0, 12)
      .map(
        (l) =>
          `- ${l.performedDate}: [${l.category.toUpperCase()}] ${l.title} (kesto: ${l.durationMinutes ?? "-"} min, RPE: ${l.rpe ?? "-"}, palautuminen: ${l.recoveryStatus}, happi: ${l.oxygenScore ?? "-"}/5, tuntemukset: "${l.feelings}")`
      )
      .join("\n");

    const systemInstruction = `Olet Treenimaster – kokenut, analyyttinen, rehellinen ja suora fysiikka- ja voimavalmentaja.
Käyttäjä on 49-vuotias kokenut voimailija (1RM laskentapohjat: Maastaveto 205 kg, Penkki 112,5 kg, Etukyykky 132,5 kg, Lisäpainoleuat +55 kg; 12 viikon tavoitteet: DL 210–212,5 kg, B 117,5 kg, S 135–137,5 kg, L +57,5–60 kg).

VALMENNUSPERIAATTEET (EHDOTTOMAT SÄÄNNÖT):
1. Älä koskaan yritä vain miellyttää käyttäjää tai myötäillä sokeasti. Arvioi kokonaisuutta kriittisesti fysiologian, keskushermoston (CNS) palautumisen, PAP-kontrastivoiman ja Minimum Effective Training Dose (METD) -tutkimusnäytön pohjalta.
2. Tarkastele kehitystä, kuormitusta ja palautumista pitkällä aikavälillä (useiden viikkojen trendeinä). Älä ylireagoi yksittäiseen treeniin tai lenkkiin.
3. ÄLÄ KOSKAAN muuta 8 viikon voimaohjelmaa automaattisesti. Jos havaitset pitkän aikavälin trendissä, että palautuminen sakkaa, aerobinen kuorma (juoksu/tennis/hiihto) syö voimatasoja tai käyttäjä pyytää ohjelman säätöä, aseta hasProgramProposal=true ja tee perusteltu muutosehdotus, jonka käyttäjä voi hyväksyä tai hylätä.
4. AUTOMAATTINEN TREENIN JA TUNTEMUSTEN KIRJAUS:
   Jos käyttäjä kertoo tehneensä harjoituksen (esim. juoksulenkki, tennis, hiihto, muu treeni tai lepopäivä), aseta detectedWorkout.shouldLog = true ja poimi tarkasti:
   - category: 'run' (juoksu/lenkki), 'tennis' (tennis), 'ski' (hiihto), 'strength' (kuntosali/voima), 'other' (muu liikunta), 'rest' (lepopäivä)
   - title: selkeä otsikko suomeksi (esim. "Aamulenkki 22 min" tai "Tennis 60 min")
   - performedDate: muodossa YYYY-MM-DD (tänään on ${todayISO}; jos käyttäjä sanoo "eilen", laske eilinen päivämäärä)
   - durationMinutes: kesto minuutteina (esim. "tunnin" = 60, "22 minuuttia" = 22)
   - rpe: arvioitu kuormitus 1-10
   - feelings: tiivistelmä käyttäjän subjektiivisista tuntemuksista (miten happi kulki, miten jaksoi, väsymys, palautuminen)
   - oxygenScore: 1-5 (miten happi kulki)
   - energyScore: 1-5 (miten voimat/jaksaminen riittivät)
   - recoveryStatus: 'erinomainen' | 'normaali' | 'tukkoinen' | 'flunssainen'

TÄMÄN PÄIVÄN PÄIVÄMÄÄRÄ: ${todayISO}
SEURAAVA VUOROSSA OLEVA VOIMATREENI: ${
      nextWorkout
        ? `${nextWorkout.title} (${nextWorkout.structureLabel}) – ${nextWorkout.exercises
            .map((e) => `${e.name}: ${e.summary}`)
            .join(" | ")}`
        : "Kierto 1 · Treeni 1"
    }

VIIMEISIMMÄT SUORITUKSET JA TUNTEMUKSET SUPABASESSA:
${recentLogsSummary || "Ei aiempia kirjauksia."}

TIETOPOHJA JA 43 NOTEBOOKLM-LÄHDETTÄ:
${knowledgeBase}`;

    const ai = new GoogleGenAI({ apiKey });

    const historyText = chatHistory
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Urheilija" : "Treenimaster"}: ${m.content}`)
      .join("\n\n");

    const prompt = `${
      historyText ? `Aiempi keskustelu:\n${historyText}\n\n` : ""
    }Urheilijan uusi viesti: "${message}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description:
                "Valmentajan analyyttinen, suora ja asiantunteva vastaus suomeksi Markdown-muodossa.",
            },
            detectedWorkout: {
              type: Type.OBJECT,
              properties: {
                shouldLog: {
                  type: Type.BOOLEAN,
                  description:
                    "True, jos käyttäjä kertoo suorittaneensa treenin, lenkin, tenniksen, hiihdon tai lepopäivän, joka tulee kirjata kalenteriin.",
                },
                category: {
                  type: Type.STRING,
                  description:
                    "Laji: 'run' | 'tennis' | 'ski' | 'strength' | 'other' | 'rest'",
                },
                title: {
                  type: Type.STRING,
                  description: "Harjoituksen selkeä nimi suomeksi, esim. 'Aamulenkki 22 min'",
                },
                performedDate: {
                  type: Type.STRING,
                  description: "Suorituspäivämäärä muodossa YYYY-MM-DD",
                },
                durationMinutes: {
                  type: Type.NUMBER,
                  description: "Suorituksen kesto minuutteina",
                },
                rpe: {
                  type: Type.NUMBER,
                  description: "Arvioitu kuormitusaste RPE 1-10",
                },
                feelings: {
                  type: Type.STRING,
                  description:
                    "Subjektiiviset tuntemukset: miten happi kulki, jaksaminen, lihasten ja hermoston vire",
                },
                oxygenScore: {
                  type: Type.NUMBER,
                  description: "Miten happi kulki asteikolla 1-5",
                },
                energyScore: {
                  type: Type.NUMBER,
                  description: "Jaksaminen ja voimataso asteikolla 1-5",
                },
                recoveryStatus: {
                  type: Type.STRING,
                  description:
                    "'erinomainen' | 'normaali' | 'tukkoinen' | 'flunssainen'",
                },
              },
              required: ["shouldLog"],
            },
            hasProgramProposal: {
              type: Type.BOOLEAN,
              description:
                "True VAIN jos pitkän aikavälin trendi tai käyttäjän pyyntö vaatii perusteltua muutosehdotusta 8 viikon ohjelmaan (käyttäjän hyväksyttäväksi).",
            },
            proposalReason: {
              type: Type.STRING,
              description:
                "Fysiologinen perustelu muutosehdotukselle, jos hasProgramProposal on true.",
            },
            proposalSummary: {
              type: Type.STRING,
              description:
                "Lyhyt yhteenveto ehdotetusta muutoksesta, jos hasProgramProposal on true.",
            },
            loadAdjustmentPercent: {
              type: Type.NUMBER,
              description:
                "Kuorman muutosprosentti (esim. -5 tai -10 kevennykselle), jos hasProgramProposal on true.",
            },
          },
          required: ["reply", "detectedWorkout", "hasProgramProposal"],
        },
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);

    const aiDetected: DetectedWorkoutPayload | undefined =
      parsed.detectedWorkout;
    const finalDetected: DetectedWorkoutPayload | null =
      aiDetected && aiDetected.shouldLog
        ? {
            shouldLog: true,
            category:
              (aiDetected.category as SportCategory) ||
              fallbackDetected.category ||
              "other",
            // Käytetään aina vakiomuotoista otsikkoa (esim. "Juoksu (Kevyt PK) · 5 km · 28 min")
            title:
              fallbackDetected.title ||
              aiDetected.title ||
              "Harjoitus",
            performedDate:
              aiDetected.performedDate ||
              fallbackDetected.performedDate ||
              todayISO,
            durationMinutes:
              typeof aiDetected.durationMinutes === "number"
                ? aiDetected.durationMinutes
                : fallbackDetected.durationMinutes ?? 30,
            rpe:
              typeof aiDetected.rpe === "number"
                ? aiDetected.rpe
                : fallbackDetected.rpe ?? 6.5,
            feelings:
              fallbackDetected.feelings ||
              aiDetected.feelings ||
              message.trim(),
            oxygenScore:
              aiDetected.oxygenScore ?? fallbackDetected.oxygenScore ?? 4,
            energyScore:
              aiDetected.energyScore ?? fallbackDetected.energyScore ?? 4,
            recoveryStatus:
              (aiDetected.recoveryStatus as RecoveryStatus) ||
              fallbackDetected.recoveryStatus ||
              "normaali",
          }
        : fallbackDetected.shouldLog
        ? fallbackDetected
        : null;

    let programProposal: ProgramModificationProposal | null = null;
    if (parsed.hasProgramProposal && nextWorkout) {
      const pct =
        typeof parsed.loadAdjustmentPercent === "number"
          ? parsed.loadAdjustmentPercent
          : -5;
      const factor = 1 + pct / 100;
      const updatedExercises: ExercisePlan[] = nextWorkout.exercises.map(
        (ex) => ({
          ...ex,
          sets: ex.sets.map((s) => {
            const num = parseFloat(s.weightKg.replace("+", ""));
            if (Number.isNaN(num) || num <= 0) return s;
            const prefix = s.weightKg.startsWith("+") ? "+" : "";
            const adjusted = Math.round((num * factor) / 2.5) * 2.5;
            return {
              ...s,
              weightKg: `${prefix}${adjusted}`,
              actualWeightKg: `${prefix}${adjusted}`,
            };
          }),
        })
      );

      programProposal = {
        id: `prop-${Date.now()}`,
        targetWorkoutId: nextWorkout.id,
        cycleNumber: nextWorkout.cycleNumber,
        workoutNumber: nextWorkout.workoutNumber,
        reason:
          parsed.proposalReason ||
          "Pitkän aikavälin kuormitustrendin ja palautumisen perusteella suositeltu säätö.",
        summary:
          parsed.proposalSummary ||
          `Säädä harjoituksen ${nextWorkout.title} kuormia (${pct}%)`,
        updatedExercises,
      };
    }

    return NextResponse.json({
      reply: parsed.reply,
      detectedWorkout: finalDetected,
      programProposal,
    });
  } catch (err) {
    console.warn("Gemini API fallback aktivoidaan:", err);
    try {
      const body = await request.clone().json().catch(() => ({}));
      const message = body.message || "";
      const todayISO = body.todayISO || new Date().toISOString().slice(0, 10);
      const fallbackDetected = fallbackExtractWorkout(message, todayISO);
      const fb = buildFallbackCoachReply(
        message,
        fallbackDetected,
        body.nextWorkout,
        body.recentLogs || []
      );
      return NextResponse.json({
        reply: fb.reply,
        detectedWorkout: fallbackDetected.shouldLog ? fallbackDetected : null,
        programProposal: fb.proposal,
      });
    } catch {
      return NextResponse.json(
        { error: "Virhe valmentajan vastauksessa." },
        { status: 500 }
      );
    }
  }
}
