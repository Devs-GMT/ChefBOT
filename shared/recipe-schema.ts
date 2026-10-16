/**
 * Shared, dependency-free recipe schema + canonical title normalization.
 *
 * Imported by the frontend (lib/*) and the Cloudflare Worker
 * (worker/src/index.ts). Must stay pure TypeScript with no runtime
 * dependencies so the Worker bundle stays small and the frontend can
 * share one implementation of the recipe-key rule.
 *
 * Normalization rule (mirrors contracts/ChefBOT.sol):
 *   1. UTF-8 bytes.
 *   2. Trim leading/trailing ASCII whitespace (space, tab, LF, CR).
 *   3. Lowercase ASCII letters only (0x41-0x5A -> +0x20).
 */

export const RECIPES_COUNT = 3;
export const MAX_STEPS = 8;
export const MAX_TITLE_BYTES = 64;
export const MAX_EMOJI_BYTES = 16;
export const MAX_INGREDIENTS = 12;
export const MIN_INGREDIENTS = 2;
export const MAX_INGREDIENT_LENGTH = 40;
export const MAX_STEP_LENGTH = 300;
export const ALLOWED_MAX_MINUTES = [10, 20, 30] as const;

export interface Recipe {
  title: string;
  emoji: string;
  minutes: number;
  uses: string[];
  missing: string[];
  steps: string[];
}

export interface RecipesResponse {
  recipes: Recipe[];
}

export interface RecipeRequest {
  ingredients: string[];
  maxMinutes: number;
  vegetarian: boolean;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function isAsciiSpace(byte: number): boolean {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
}

function trimBytes(bytes: Uint8Array): Uint8Array {
  let start = 0;
  let end = bytes.length;
  while (start < end) {
    const byte = bytes[start];
    if (byte === undefined || !isAsciiSpace(byte)) break;
    start++;
  }
  while (end > start) {
    const byte = bytes[end - 1];
    if (byte === undefined || !isAsciiSpace(byte)) break;
    end--;
  }
  return bytes.slice(start, end);
}

/** Canonical normalized form (lowercased, trimmed) — the recipe-key input. */
export function normalizeTitle(title: string): string {
  const trimmed = trimBytes(encoder.encode(title));
  for (let i = 0; i < trimmed.length; i++) {
    const byte = trimmed[i];
    if (byte === undefined) continue;
    if (byte >= 0x41 && byte <= 0x5a) {
      trimmed[i] = byte + 0x20;
    }
  }
  return decoder.decode(trimmed);
}

/** Display form: trimmed, original casing preserved. */
export function trimTitle(title: string): string {
  return decoder.decode(trimBytes(encoder.encode(title)));
}

export function byteLength(value: string): number {
  return encoder.encode(value).length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStringArray(
  value: unknown,
  field: string,
  opts: { min: number; max: number; maxLength: number },
): ValidationResult<string[]> {
  if (!Array.isArray(value)) {
    return { ok: false, reason: `${field}: not an array` };
  }
  if (value.length < opts.min || value.length > opts.max) {
    return {
      ok: false,
      reason: `${field}: length ${value.length} outside ${opts.min}..${opts.max}`,
    };
  }
  const out: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") {
      return { ok: false, reason: `${field}[${index}]: not a string` };
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) {
      return { ok: false, reason: `${field}[${index}]: empty` };
    }
    if (trimmed.length > opts.maxLength) {
      return {
        ok: false,
        reason: `${field}[${index}]: longer than ${opts.maxLength}`,
      };
    }
    out.push(trimmed);
  }
  return { ok: true, value: out };
}

/**
 * Validate an incoming POST /recipes request body.
 * Accepts any non-empty string ingredients (the frontend sends canonical
 * ids from lib/ingredients.ts); strict type and size checks only.
 */
export function validateRecipesRequest(
  data: unknown,
): ValidationResult<RecipeRequest> {
  if (!isPlainObject(data)) {
    return { ok: false, reason: "body: not an object" };
  }

  const ingredientsResult = validateStringArray(
    data.ingredients,
    "ingredients",
    { min: MIN_INGREDIENTS, max: MAX_INGREDIENTS, maxLength: MAX_INGREDIENT_LENGTH },
  );
  if (!ingredientsResult.ok) return ingredientsResult;
  const ingredients = ingredientsResult.value.map((i) => i.toLowerCase());
  const unique = [...new Set(ingredients)];
  if (unique.length > MAX_INGREDIENTS) {
    return { ok: false, reason: "ingredients: too many unique items" };
  }

  if (typeof data.maxMinutes !== "number" || !Number.isInteger(data.maxMinutes)) {
    return { ok: false, reason: "maxMinutes: not an integer" };
  }
  if (!(ALLOWED_MAX_MINUTES as readonly number[]).includes(data.maxMinutes)) {
    return { ok: false, reason: "maxMinutes: not one of 10, 20, 30" };
  }

  if (typeof data.vegetarian !== "boolean") {
    return { ok: false, reason: "vegetarian: not a boolean" };
  }

  return {
    ok: true,
    value: {
      ingredients: unique,
      maxMinutes: data.maxMinutes,
      vegetarian: data.vegetarian,
    },
  };
}

/**
 * Validate an AI (or test) recipe payload. Never trust model JSON:
 * structure, types, lengths, byte caps, step counts, and duplicate
 * titles are all checked before anything reaches the UI.
 */
export function validateRecipesResponse(
  data: unknown,
  opts: { maxMinutes?: number } = {},
): ValidationResult<RecipesResponse> {
  const maxMinutes = opts.maxMinutes ?? 30;
  if (!isPlainObject(data)) {
    return { ok: false, reason: "response: not an object" };
  }
  if (!Array.isArray(data.recipes)) {
    return { ok: false, reason: "recipes: not an array" };
  }
  if (data.recipes.length !== RECIPES_COUNT) {
    return {
      ok: false,
      reason: `recipes: expected exactly ${RECIPES_COUNT}, got ${data.recipes.length}`,
    };
  }

  const recipes: Recipe[] = [];
  const seenTitles = new Set<string>();

  for (const [index, raw] of data.recipes.entries()) {
    if (!isPlainObject(raw)) {
      return { ok: false, reason: `recipes[${index}]: not an object` };
    }

    if (typeof raw.title !== "string") {
      return { ok: false, reason: `recipes[${index}].title: not a string` };
    }
    const title = trimTitle(raw.title);
    if (title.length === 0) {
      return { ok: false, reason: `recipes[${index}].title: empty` };
    }
    if (byteLength(title) > MAX_TITLE_BYTES) {
      return {
        ok: false,
        reason: `recipes[${index}].title: exceeds ${MAX_TITLE_BYTES} bytes`,
      };
    }
    const normalized = normalizeTitle(title);
    if (seenTitles.has(normalized)) {
      return {
        ok: false,
        reason: `recipes[${index}].title: duplicate recipe key`,
      };
    }
    seenTitles.add(normalized);

    if (typeof raw.emoji !== "string" || raw.emoji.trim().length === 0) {
      return { ok: false, reason: `recipes[${index}].emoji: missing` };
    }
    const emoji = raw.emoji.trim();
    if (byteLength(emoji) > MAX_EMOJI_BYTES) {
      return {
        ok: false,
        reason: `recipes[${index}].emoji: exceeds ${MAX_EMOJI_BYTES} bytes`,
      };
    }

    if (typeof raw.minutes !== "number" || !Number.isInteger(raw.minutes)) {
      return { ok: false, reason: `recipes[${index}].minutes: not an integer` };
    }
    if (raw.minutes < 1 || raw.minutes > maxMinutes) {
      return {
        ok: false,
        reason: `recipes[${index}].minutes: ${raw.minutes} outside 1..${maxMinutes}`,
      };
    }

    const usesResult = validateStringArray(raw.uses, `recipes[${index}].uses`, {
      min: 0,
      max: MAX_INGREDIENTS,
      maxLength: MAX_INGREDIENT_LENGTH,
    });
    if (!usesResult.ok) return usesResult;

    const missingResult = validateStringArray(
      raw.missing,
      `recipes[${index}].missing`,
      { min: 0, max: MAX_INGREDIENTS, maxLength: MAX_INGREDIENT_LENGTH },
    );
    if (!missingResult.ok) return missingResult;

    const stepsResult = validateStringArray(raw.steps, `recipes[${index}].steps`, {
      min: 1,
      max: MAX_STEPS,
      maxLength: MAX_STEP_LENGTH,
    });
    if (!stepsResult.ok) return stepsResult;

    recipes.push({
      title,
      emoji,
      minutes: raw.minutes,
      uses: usesResult.value,
      missing: missingResult.value,
      steps: stepsResult.value,
    });
  }

  return { ok: true, value: { recipes } };
}
