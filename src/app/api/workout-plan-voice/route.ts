import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithRetry } from "@/lib/gemini";

interface ExerciseContextItem {
  id: string;
  name: string;
  code: string;
  setsCount: number;
  reps: string;
  weightKg: string;
}

export interface VoicePlanAdjustment {
  exerciseId: string;
  exerciseName: string;
  newSetsCount?: number | null;
  newWeightKg?: string | null;
  newReps?: string | null;
  skipExercise?: boolean | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transcript = String(body.transcript || "").trim();
    const exercises = Array.isArray(body.exercises)
      ? (body.exercises as ExerciseContextItem[])
      : [];

    if (!transcript) {
      return NextResponse.json(
        { error: "Tyhjä saneluteksti." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        noteText: transcript,
        adjustments: [],
        summary: "Lisätty muistiinpanoon.",
      });
    }

    const exercisesList = exercises
      .map(
        (ex) =>
          `- id="${ex.id}", nimi="${ex.name}", koodi="${ex.code}", sarjat=${ex.setsCount}, toistot="${ex.reps}", paino="${ex.weightKg}"`
      )
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });
    const response = await generateContentWithRetry(ai, {
      tier: "lite",
      contents: `Käyttäjä saneli ennen treeniä tai treenin aikana seuraavan viestin:
"${transcript}"

Tämän treenin liikkeet ovat:
${exercisesList}

TEHTÄVÄ:
1. Poimi "noteText"-kenttään tiivis, kieliopillisesti puhdas suomenkielinen muistiinpano käyttäjän kertomasta lämmittelystä, voinnista tai suunnitelmasta (jos viesti sisältää vain sarjamuutoksen ilman muuta kommenttia, voi noteText olla lyhyt tai tyhjä ""). ÄLÄ keksi mitään mitä käyttäjä ei sanonut!
2. Poimi "adjustments"-taulukkoon VAIN ne liikkeet, joiden sarjamäärää, painoa, toistoja tai tekemättä jättämistä käyttäjä selkeästi pyysi muuttamaan. Käytä tarkalleen yllä olevaa "id"-arvoa "exerciseId"-kentässä.
   - Esim. "teen maastavedossa vain 2 sarjaa 160 kilolla" -> newSetsCount: 2, newWeightKg: "160"
   - Esim. "jätän etukyykyn tänään väliin" -> skipExercise: true
   - Jos muutoksia ei pyydetty (esim. pelkkä lämmittely tai vointikommentti), palauta adjustments: [].
3. Kirjoita "summary"-kenttään lyhyt suomenkielinen kuittaus tehdyistä muutoksista (esim. "Maastaveto: 2 sarjaa × 160 kg"), tai "" jos vain muistiinpano lisättiin.`,
      config: {
        maxOutputTokens: 500,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            noteText: { type: Type.STRING },
            summary: { type: Type.STRING },
            adjustments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  exerciseId: { type: Type.STRING },
                  exerciseName: { type: Type.STRING },
                  newSetsCount: { type: Type.NUMBER, nullable: true },
                  newWeightKg: { type: Type.STRING, nullable: true },
                  newReps: { type: Type.STRING, nullable: true },
                  skipExercise: { type: Type.BOOLEAN, nullable: true },
                },
                required: ["exerciseId", "exerciseName"],
              },
            },
          },
          required: ["noteText", "summary", "adjustments"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return NextResponse.json({
      noteText: String(parsed.noteText || "").trim(),
      summary: String(parsed.summary || "").trim(),
      adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
    });
  } catch {
    return NextResponse.json(
      { error: "Suunnitelman muokkaus sanelusta epäonnistui." },
      { status: 500 }
    );
  }
}
