import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { formatGeminiError, generateContentWithRetry } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY puuttuu palvelimelta." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!(audioFile instanceof Blob) || audioFile.size === 0) {
      return NextResponse.json(
        { error: "Tyhjä äänitiedosto." },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const rawMime = audioFile.type || "audio/mp4";
    // Gemini hyväksyy mm. audio/mp4, audio/webm, audio/ogg, audio/wav
    const mimeType = rawMime.split(";")[0].trim() || "audio/mp4";

    const ai = new GoogleGenAI({ apiKey });
    const response = await generateContentWithRetry(ai, {
      tier: "lite",
      config: {
        maxOutputTokens: 350,
      },
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
        {
          text: `Litteroi tämä suomenkielinen treenisanelu suoraan siistiksi, kieliopillisesti puhtaaksi suomen kieleksi (oikeinkirjoitus, yhdyssanat ja välimerkit kuntoon).
TÄRKEÄÄ:
- Laajenna treenilyhenteet oikeiksi nimiksi (esim. HF -> Human Flag, mave/mawe -> maastaveto, pena -> penkkipunnerrus, etari -> etukyykky).
- ÄLÄ keksi tai lisää mitään, mitä puhuja ei sanonut.
- Palauta VAIN litteroitu teksti ilman lainausmerkkejä tai selityksiä.`,
        },
      ],
    });

    const text = (response.text || "").trim();
    return NextResponse.json({ text });
  } catch (err) {
    const msg = formatGeminiError(err, "Puheen litterointi epäonnistui.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
