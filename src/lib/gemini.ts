import { GoogleGenAI } from "@google/genai";

export const GEMINI_FLASH_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
] as const;

type GenerateParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

function isRetryableOrSlowError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("404") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("NOT_FOUND") ||
    msg.includes("high demand") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  );
}

/**
 * Kutsuu Geminiä automaattisella aikakatkaisulla ja mallivarajärjestelmällä,
 * jotta yksittäisen mallin ruuhka tai jumi ei jää pyörimään ikuisesti.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Omit<GenerateParams, "model"> & { model?: string },
  perModelTimeoutMs = 9000
) {
  const models = params.model
    ? [params.model, ...GEMINI_FLASH_MODELS.filter((m) => m !== params.model)]
    : [...GEMINI_FLASH_MODELS];

  let lastError: unknown;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perModelTimeoutMs);

    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
        config: {
          ...params.config,
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (!isRetryableOrSlowError(err)) {
        throw err;
      }
    }
  }

  throw lastError;
}

export function formatGeminiError(err: unknown, fallback: string): string {
  if (isRetryableOrSlowError(err)) {
    return "Tekoälypalvelu on hetkellisesti ruuhkautunut. Kokeile hetken päästä uudelleen.";
  }
  return err instanceof Error && !err.message.trim().startsWith("{")
    ? err.message
    : fallback;
}
