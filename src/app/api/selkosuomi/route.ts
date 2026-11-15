import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { parseSpokenFeelingsToSelkosuomi } from "@/lib/workoutParser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawText = String(body.rawText || "").trim();
    const mode = (body.mode as "strength" | "run" | "skip") || "strength";

    if (!rawText) {
      return NextResponse.json({ error: "Tyhjä sanelu" }, { status: 400 });
    }

    const fallback = parseSpokenFeelingsToSelkosuomi(rawText, mode);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(fallback);
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Muunna käyttäjän puhekielinen treenisanelu siistiksi, ytimekkääksi ja selkeäksi suomen kieleksi (selkosuomeksi, 1–2 virkettä) Supabase-tietokantaan tallennusta varten.
TÄRKEÄÄ: ÄLÄ KOSKAAN keksi tai lisää väitteitä (kuten "Happi kulki erinomaisesti" tai mitään muutakaan), joita käyttäjä ei sanelussaan oikeasti sanonut! Säilytä vain käyttäjän kertomat faktat (kilot, kilometrit, kesto, intervallit/vedot, tai mainitut tuntemukset) puhtaana selkosuomena.

Sanelu: "${rawText}"
Konteksti: ${mode}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selkosuomiText: {
              type: Type.STRING,
              description:
                "Siisti, selkeä ja kieliopillisesti puhdas 1-2 virkkeen yhteenveto selkosuomeksi.",
            },
            oxygenScore: {
              type: Type.NUMBER,
              description: "Arvio hapen kulusta asteikolla 1-5 (oletus 4).",
            },
            energyScore: {
              type: Type.NUMBER,
              description:
                "Arvio voimista ja tangon nopeudesta asteikolla 1-5 (oletus 4).",
            },
          },
          required: ["selkosuomiText"],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    return NextResponse.json({
      selkosuomiText: parsedJson.selkosuomiText || fallback.selkosuomiText,
      oxygenScore: parsedJson.oxygenScore || fallback.oxygenScore,
      energyScore: parsedJson.energyScore || fallback.energyScore,
      recoveryStatus: fallback.recoveryStatus,
      suggestedDeviationChip: fallback.suggestedDeviationChip,
    });
  } catch {
    return NextResponse.json({ error: "Muunnos epäonnistui" }, { status: 500 });
  }
}
