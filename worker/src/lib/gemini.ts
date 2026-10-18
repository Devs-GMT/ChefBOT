/**
 * Google Gemini (free tier) via the REST `models.generateContent` method.
 * Zero dependencies: plain fetch + AbortController.
 *
 * - The key travels in the `x-goog-api-key` header (never in the URL, so it
 *   cannot end up in logs).
 * - JSON mode: `responseMimeType: application/json` + a `responseSchema`.
 * - Thought parts (`thought: true`) are ignored; only answer text is parsed.
 * - Every outcome is a small tagged union; callers decide the HTTP status.
 */

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
/** Fast free-tier Flash-Lite model — fits the Worker's 7 s budget. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
/** Worker-side budget; the frontend budget is 8 s (lib/recipes.ts). */
export const AI_TIMEOUT_MS = 7000;

/** Finish reasons that mean the model refused or was cut off. */
const BLOCKED = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "LANGUAGE",
  "OTHER",
  "MAX_TOKENS",
  "MALFORMED_RESPONSE",
]);

export function geminiUrl(model: string): string {
  return `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
}

export interface GeminiCall {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  responseSchema: unknown;
  thinkingLevel?: string;
  temperature?: number;
  /** Optional photo sent before the text part (fridge scan). */
  image?: { mimeType: string; data: string };
  /** Defaults to AI_TIMEOUT_MS. */
  timeoutMs?: number;
}

export type GeminiOutcome =
  | { ok: true; data: unknown }
  | {
      ok: false;
      reason: "timeout" | "upstream" | "blocked" | "no_content" | "not_json";
      /** Provider HTTP status when reason is "upstream" (status only, never the body). */
      status?: number;
    };

/** Short, non-sensitive failure tag for error responses, e.g. "upstream_429". */
export function failureTag(outcome: { reason: string; status?: number }): string {
  return outcome.status ? `${outcome.reason}_${outcome.status}` : outcome.reason;
}

interface GeminiPart {
  text?: unknown;
  thought?: unknown;
}

interface GeminiBody {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: unknown }>;
  promptFeedback?: { blockReason?: unknown };
}

export async function callGemini(
  call: GeminiCall,
  fetchImpl: typeof fetch = fetch,
): Promise<GeminiOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), call.timeoutMs ?? AI_TIMEOUT_MS);
  try {
    const generationConfig: Record<string, unknown> = {
      temperature: call.temperature ?? 0.7,
      responseMimeType: "application/json",
      responseSchema: call.responseSchema,
    };
    if (call.thinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel: call.thinkingLevel };
    }

    const response = await fetchImpl(geminiUrl(call.model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": call.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: call.system }] },
        contents: [
          {
            role: "user",
            parts: [
              ...(call.image ? [{ inlineData: call.image }] : []),
              { text: call.user },
            ],
          },
        ],
        generationConfig,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Status only (429 = free-tier quota) — never the body, URL or key.
      console.warn(`gemini upstream HTTP ${response.status} (${call.model})`);
      return { ok: false, reason: "upstream", status: response.status };
    }

    const body = (await response.json()) as GeminiBody;
    if (body.promptFeedback?.blockReason) {
      return { ok: false, reason: "blocked" };
    }
    const candidate = body.candidates?.[0];
    if (typeof candidate?.finishReason === "string" && BLOCKED.has(candidate.finishReason)) {
      return { ok: false, reason: "blocked" };
    }
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => part.thought !== true && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("")
      .trim();
    if (!text) {
      return { ok: false, reason: "no_content" };
    }
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, reason: "not_json" };
    }
  } catch (error) {
    const name =
      error !== null && typeof error === "object" && "name" in error ? String(error.name) : "";
    return {
      ok: false,
      reason: name === "AbortError" || name === "TimeoutError" ? "timeout" : "upstream",
    };
  } finally {
    clearTimeout(timer);
  }
}
