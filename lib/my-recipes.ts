"use client";

import { useSyncExternalStore } from "react";

import {
  MAX_EMOJI_BYTES,
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
  MAX_STEPS,
  MAX_STEP_LENGTH,
  MAX_TITLE_BYTES,
  byteLength,
  normalizeTitle,
  validateRecipe,
  type Recipe,
  type ValidationResult,
} from "@/shared/recipe-schema";

/**
 * "My recipes" (v1.1): recipes a cook writes themselves. They live only in
 * this browser (no account, never sent to the archive); stamping one puts
 * just its title + emoji on-chain, like any other dish. Storage can be
 * blocked or corrupt, so reads/writes are guarded and the list keeps
 * working in memory.
 */

export const MY_RECIPES_KEY = "chefbot.my-recipes.v1";
export const MAX_MY_RECIPES = 30;
export const MAX_MY_MINUTES = 180;
const DEFAULT_EMOJI = "🍳";

/** The form's raw fields. */
export interface RecipeDraft {
  title: string;
  emoji: string;
  minutes: string;
  /** Comma-separated. */
  ingredients: string;
  /** One step per line. */
  steps: string;
}

const EMPTY: Recipe[] = [];
let recipes: Recipe[] | null = null;
const listeners = new Set<() => void>();

export function draftToRecipe(draft: RecipeDraft): ValidationResult<Recipe> {
  const title = draft.title.trim();
  if (!title) return { ok: false, reason: "Give your recipe a title." };
  if (byteLength(title) > MAX_TITLE_BYTES) {
    return { ok: false, reason: "Title is too long — keep it short enough to stamp on-chain." };
  }
  const emoji = draft.emoji.trim() || DEFAULT_EMOJI;
  if (byteLength(emoji) > MAX_EMOJI_BYTES) return { ok: false, reason: "Use a single emoji." };

  const minutes = Number(draft.minutes.trim());
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MY_MINUTES) {
    return { ok: false, reason: `Cooking time must be 1–${MAX_MY_MINUTES} minutes.` };
  }

  const uses = [
    ...new Set(
      draft.ingredients
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (uses.length > MAX_INGREDIENTS) {
    return { ok: false, reason: `List at most ${MAX_INGREDIENTS} ingredients.` };
  }
  if (uses.some((item) => item.length > MAX_INGREDIENT_LENGTH)) {
    return { ok: false, reason: `Keep each ingredient under ${MAX_INGREDIENT_LENGTH} characters.` };
  }

  const steps = draft.steps
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);
  if (steps.length === 0) return { ok: false, reason: "Add at least one step." };
  if (steps.length > MAX_STEPS) return { ok: false, reason: `At most ${MAX_STEPS} steps.` };
  if (steps.some((step) => step.length > MAX_STEP_LENGTH)) {
    return { ok: false, reason: `Each step must be ${MAX_STEP_LENGTH} characters or less.` };
  }

  // The shared validator has the final word (same rules as AI recipes).
  const checked = validateRecipe(
    { title, emoji, minutes, uses, missing: [], steps },
    { maxMinutes: MAX_MY_MINUTES },
  );
  return checked.ok ? checked : { ok: false, reason: "That recipe could not be saved." };
}

function load(): Recipe[] {
  try {
    const raw = window.localStorage.getItem(MY_RECIPES_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const seen = new Set<string>();
    const out: Recipe[] = [];
    for (const entry of parsed) {
      const checked = validateRecipe(entry, { maxMinutes: MAX_MY_MINUTES });
      if (!checked.ok) continue;
      const key = normalizeTitle(checked.value.title);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(checked.value);
      if (out.length === MAX_MY_RECIPES) break;
    }
    return out;
  } catch {
    return EMPTY;
  }
}

function commit(next: Recipe[]) {
  recipes = next;
  try {
    window.localStorage.setItem(MY_RECIPES_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: keep the in-memory list.
  }
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== MY_RECIPES_KEY) return;
    recipes = load();
    listeners.forEach((listener) => listener());
  });
}

export function getMyRecipes(): Recipe[] {
  if (recipes === null) recipes = typeof window === "undefined" ? EMPTY : load();
  return recipes;
}

/** Re-read storage on next access (tests, and after external changes). */
export function resetMyRecipes() {
  recipes = null;
}

/**
 * Add a recipe, or replace `previousTitle` when editing. Titles are unique
 * per cook (case-insensitive), matching how the chain keys dishes.
 */
export function saveMyRecipe(
  recipe: Recipe,
  previousTitle?: string,
): { ok: true } | { ok: false; reason: string } {
  const list = getMyRecipes();
  const key = normalizeTitle(recipe.title);
  const previous = previousTitle === undefined ? null : normalizeTitle(previousTitle);
  const clash = list.some((r) => normalizeTitle(r.title) === key && normalizeTitle(r.title) !== previous);
  if (clash) return { ok: false, reason: `You already have a recipe called “${recipe.title}”.` };

  if (previous !== null) {
    commit(list.map((r) => (normalizeTitle(r.title) === previous ? recipe : r)));
    return { ok: true };
  }
  if (list.length >= MAX_MY_RECIPES) {
    return { ok: false, reason: `You can keep up to ${MAX_MY_RECIPES} recipes here.` };
  }
  commit([recipe, ...list]);
  return { ok: true };
}

export function deleteMyRecipe(title: string) {
  const key = normalizeTitle(title);
  commit(getMyRecipes().filter((r) => normalizeTitle(r.title) !== key));
}

export function subscribeMyRecipes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMyRecipes(): Recipe[] {
  return useSyncExternalStore(subscribeMyRecipes, getMyRecipes, () => EMPTY);
}
