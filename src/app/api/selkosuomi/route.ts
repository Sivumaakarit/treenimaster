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
      model: "gemini-3.8-flash",
      contents: `Korjaa käyttäjän puhekielisen treenisanelun tai pikamuistiinpanon oikeinkirjoitus, yhdyssanat ja välimerkit siistiksi, luontevaksi ja kieliopillisesti puhtaaksi suomen kieleksi (1–3 virkettä) tietokantaan tallennusta varten.
TÄRKEÄÄ:
- Laajenna treenilyhenteet oikeiksi nimiksi (esim. HF -> Human Flag, mave/mawe -> maastaveto, pena -> penkkipunnerrus, etari -> etukyykky).
- ÄLÄ KOSKAAN keksi tai lisää väitteitä (kuten "Happi kulki erinomaisesti" tai mitään muutakaan), joita käyttäjä ei oikeasti sanonut tai kirjoittanut! Säilytä vain käyttäjän kertomat faktat puhtaana selkosuomena.

Teksti: "${rawText}"
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
      oxygenScore: parsedJson.oxygenScore ?? null,
      energyScore: parsedJson.energyScore ?? null,
      recoveryStatus: fallback.recoveryStatus,
      suggestedDeviationChip: fallback.suggestedDeviationChip,
    });
  } catch {
    return NextResponse.json({ error: "Muunnos epäonnistui" }, { status: 500 });
  }
}
