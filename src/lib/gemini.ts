import { GoogleGenAI } from "@google/genai";

export const GEMINI_FLASH_MODEL = "gemini-3.8-flash";

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("high demand")
  );
}

/**
 * Kutsuu Geminiä automaattisella uudelleenyrityksellä tilapäisten ruuhkavirheiden (503/429) varalta.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Omit<GenerateParams, "model"> & { model?: string },
  maxAttempts = 3
) {
  const model = params.model ?? GEMINI_FLASH_MODEL;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = attempt === 1 ? 700 : 1500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

export function formatGeminiError(err: unknown, fallback: string): string {
  if (isTransientError(err)) {
    return "Tekoälypalvelu on hetkellisesti ruuhkautunut. Kokeile hetken päästä uudelleen.";
  }
  return err instanceof Error && !err.message.trim().startsWith("{")
    ? err.message
    : fallback;
}
