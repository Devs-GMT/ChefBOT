/**
 * ChefBOT shared Cloudflare Worker.
 *
 * POST /recipes — server-side AI recipe generation (OpenAI gpt-4o-mini).
 * The provider API key never leaves this Worker. Designed to be extended
 * with further shared endpoints later (e.g. /aura, /study, /ask and
 * GitHub auth routes) without changing this routing shape.
 *
 * Uses only standard Web APIs (Request/Response/fetch/AbortController),
 * so it type-checks against the DOM lib and runs under `wrangler dev`.
 *
 * NOTE: this entry module intentionally exports ONLY the default handler —
 * the Workers runtime rejects any other export shapes from the main module.
 * Shared helpers live in ./runtime.ts.
 */

import {
  validateRecipesRequest,
  validateRecipesResponse,
  type RecipeRequest,
} from "../../shared/recipe-schema";
import {
  AI_TIMEOUT_MS,
  MAX_BODY_BYTES,
  OPENAI_MODEL,
  OPENAI_URL,
  allowedOrigins,
  checkRateLimit,
  corsHeaders,
  type WorkerEnv,
} from "./runtime";

export type { WorkerEnv } from "./runtime";

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
): Response {
  return json(status, { error: { code, message } }, headers);
}

function buildMessages(request: RecipeRequest): unknown[] {
  const timePhrase =
    request.maxMinutes <= 10
      ? "10 minutes or less"
      : request.maxMinutes <= 20
        ? "20 minutes or less"
        : "30 minutes or less";
  const dietPhrase = request.vegetarian
    ? "Recipes MUST be strictly vegetarian (no meat, fish, poultry, or seafood)."
    : "Recipes may use any ingredients.";

  return [
    {
      role: "system",
      content: [
        "You are ChefBOT, a practical home-cooking recipe assistant.",
        "Return ONLY a minified JSON object, no markdown, no commentary.",
        'Shape: {"recipes":[{"title":string,"emoji":string,"minutes":number,"uses":string[],"missing":string[],"steps":string[]}]}.',
        `Rules: exactly 3 recipes; unique titles; title at most 60 characters;`,
        `emoji: one short food emoji; minutes: integer from 1 to ${request.maxMinutes};`,
        "uses: the selected ingredient ids the recipe actually uses (lowercase, from the user's list only);",
        "missing: at most 4 pantry/fresh items the cook could add but can live without (lowercase);",
        `steps: 1 to 8 short imperative sentences a home cook follows in order (max 300 chars each);`,
        "Recipes must be realistic, tested-style home cooking with common techniques.",
        dietPhrase,
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        ingredients: request.ingredients,
        maxMinutes: request.maxMinutes,
        readyIn: timePhrase,
        vegetarian: request.vegetarian,
      }),
    },
  ];
}

type AiOutcome =
  | { ok: true; data: unknown }
  | { ok: false; reason: "timeout" | "upstream" | "no_content" | "not_json" };

async function callOpenAi(
  request: RecipeRequest,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AiOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetchImpl(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: buildMessages(request),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "upstream" };
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      return { ok: false, reason: "no_content" };
    }
    try {
      return { ok: true, data: JSON.parse(content) };
    } catch {
      return { ok: false, reason: "not_json" };
    }
  } catch (error) {
    const name =
      error !== null &&
      typeof error === "object" &&
      "name" in error &&
      typeof error.name === "string"
        ? error.name
        : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "upstream" };
  } finally {
    clearTimeout(timer);
  }
}

async function handleRecipes(
  request: Request,
  env: WorkerEnv,
  headers: Record<string, string>,
): Promise<Response> {
  const limit = Number(env.RATE_LIMIT_PER_HOUR ?? "20");
  const rateLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rate = checkRateLimit(ip, rateLimit);
  if (!rate.allowed) {
    return errorResponse(
      429,
      "rate_limited",
      "Too many requests. Try again later.",
      { ...headers, "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "Request body too large.", headers);
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "Request body too large.", headers);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(text);
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be JSON.", headers);
  }

  const validated = validateRecipesRequest(parsedBody);
  if (!validated.ok) {
    return errorResponse(400, "invalid_request", validated.reason, headers);
  }

  if (!env.OPENAI_API_KEY) {
    return errorResponse(
      503,
      "ai_not_configured",
      "Recipe service is not configured.",
      headers,
    );
  }

  const outcome = await callOpenAi(validated.value, env.OPENAI_API_KEY);
  if (!outcome.ok) {
    if (outcome.reason === "timeout") {
      return errorResponse(504, "ai_timeout", "Recipe generation timed out.", headers);
    }
    return errorResponse(502, "ai_error", "Recipe generation failed.", headers);
  }

  const recipes = validateRecipesResponse(outcome.data, {
    maxMinutes: validated.value.maxMinutes,
  });
  if (!recipes.ok) {
    return errorResponse(502, "ai_invalid", "Recipe generation returned an invalid payload.", headers);
  }

  return json(200, recipes.value, headers);
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      if (origin && !allowedOrigins(env).has(origin)) {
        return errorResponse(403, "origin_not_allowed", "Origin not allowed.");
      }
      return new Response(null, { status: 204, headers });
    }

    if (origin && !allowedOrigins(env).has(origin)) {
      return errorResponse(403, "origin_not_allowed", "Origin not allowed.", headers);
    }

    const { pathname } = new URL(request.url);
    const path = pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      return json(200, { ok: true }, headers);
    }

    if (path === "/recipes") {
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Use POST /recipes.", headers);
      }
      return handleRecipes(request, env, headers);
    }

    return errorResponse(404, "not_found", "Unknown endpoint.", headers);
  },
};
