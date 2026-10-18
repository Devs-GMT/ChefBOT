import {
  validateRecipesResponse,
  type Recipe,
  type RecipeRequest,
} from "../shared/recipe-schema";

import { selectFallbackRecipes } from "./fallback";

/** Frontend budget: the PRD specifies an 8-second timeout. */
export const RECIPES_TIMEOUT_MS = 8000;

export type FallbackReason =
  | "not_configured"
  | "timeout"
  | "network"
  | "http_error"
  | "invalid_response";

export interface RecipeResult {
  recipes: Recipe[];
  source: "ai" | "fallback";
  fallbackReason?: FallbackReason;
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_RECIPES_API_URL ?? "").replace(/\/+$/, "");
}

function toErrorName(error: unknown): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }
  return "";
}

/**
 * Request recipes from the AI Worker. Any failure — unconfigured URL,
 * timeout, network error, non-2xx status, malformed JSON, or schema
 * violation — degrades to the local curated fallback instead of failing
 * the user flow.
 */
export interface GetRecipesOptions {
  /** Titles already shown for these picks; the fallback skips them. */
  exclude?: readonly string[];
  fetchImpl?: typeof fetch;
}

export async function getRecipes(
  request: RecipeRequest,
  { exclude = [], fetchImpl = fetch }: GetRecipesOptions = {},
): Promise<RecipeResult> {
  const fallback = () => selectFallbackRecipes(request, 3, exclude);
  const base = apiBase();
  if (!base) {
    return {
      recipes: fallback(),
      source: "fallback",
      fallbackReason: "not_configured",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECIPES_TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${base}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        recipes: fallback(),
        source: "fallback",
        fallbackReason: "http_error",
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        recipes: fallback(),
        source: "fallback",
        fallbackReason: "invalid_response",
      };
    }

    const validated = validateRecipesResponse(payload, {
      maxMinutes: request.maxMinutes,
      selected: request.ingredients,
    });
    if (!validated.ok) {
      return {
        recipes: fallback(),
        source: "fallback",
        fallbackReason: "invalid_response",
      };
    }

    return { recipes: validated.value.recipes, source: "ai" };
  } catch (error) {
    const name = toErrorName(error);
    const isAbort = name === "AbortError" || name === "TimeoutError";
    return {
      recipes: fallback(),
      source: "fallback",
      fallbackReason: isAbort ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
  }
}
