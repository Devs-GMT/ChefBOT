import {
  normalizeTitle,
  type Recipe,
  type RecipeRequest,
} from "../shared/recipe-schema";
import data from "../data/recipes.json";

interface CuratedRecipe {
  title: string;
  emoji: string;
  minutes: number;
  vegetarian: boolean;
  base: string[];
  steps: string[];
}

const CURATED: CuratedRecipe[] = data.recipes;

/** Curated pool size — exposed for diagnostics and tests. */
export function curatedRecipeCount(): number {
  return CURATED.length;
}

function overlap(selected: Set<string>, base: string[]): number {
  return base.reduce((count, id) => (selected.has(id) ? count + 1 : count), 0);
}

function toRecipe(
  curated: CuratedRecipe,
  selectedIngredients: string[],
): Recipe {
  const selected = new Set(selectedIngredients);
  return {
    title: curated.title,
    emoji: curated.emoji,
    minutes: curated.minutes,
    uses: curated.base.filter((id) => selected.has(id)),
    missing: curated.base.filter((id) => !selected.has(id)),
    steps: curated.steps,
  };
}

interface Scored {
  curated: CuratedRecipe;
  score: number;
}

function rank(candidates: Scored[]): Scored[] {
  return [...candidates].sort(
    (a, b) =>
      b.score - a.score ||
      a.curated.minutes - b.curated.minutes ||
      a.curated.title.localeCompare(b.curated.title),
  );
}

/**
 * Local fallback matcher — the "House favourites" source.
 *
 * Candidates in order of preference:
 *   1. vegetarian if asked + within the time limit, by ingredient overlap
 *   2. the same diet but over the time limit (the card shows real minutes)
 *   3. any diet — only when the diet alone has fewer than `limit` recipes
 * `exclude` lists titles already shown ("New ideas"): unseen candidates
 * come first, so a narrow filter relaxes the time limit before repeating
 * anything; once every candidate has been shown it starts over. The
 * vegetarian preference is never relaxed while enough vegetarian recipes
 * exist.
 */
export function selectFallbackRecipes(
  request: RecipeRequest,
  limit = 3,
  exclude: readonly string[] = [],
): Recipe[] {
  const shown = new Set(exclude.map(normalizeTitle));
  const selected = new Set(request.ingredients);
  const scored: Scored[] = CURATED.map((curated) => ({
    curated,
    score: overlap(selected, curated.base),
  }));

  const fitsDiet = (s: Scored) => !request.vegetarian || s.curated.vegetarian;
  const diet = scored.filter(fitsDiet);
  const ordered = [
    ...rank(diet.filter((s) => s.curated.minutes <= request.maxMinutes)),
    ...rank(diet.filter((s) => s.curated.minutes > request.maxMinutes)),
    ...(diet.length < limit ? rank(scored.filter((s) => !fitsDiet(s))) : []),
  ];

  const isShown = (s: Scored) => shown.has(normalizeTitle(s.curated.title));
  const chosen = [...ordered.filter((s) => !isShown(s)), ...ordered.filter(isShown)];
  return chosen.slice(0, limit).map((s) => toRecipe(s.curated, request.ingredients));
}

/**
 * Cookbook entry for an on-chain dish title (same normalization as the
 * recipe key), so the leaderboard can show steps that never go on-chain.
 */
export function findCuratedRecipe(
  title: string,
): { title: string; emoji: string; minutes: number; steps: string[] } | null {
  const wanted = normalizeTitle(title);
  const found = CURATED.find((item) => normalizeTitle(item.title) === wanted);
  return found
    ? {
        title: found.title,
        emoji: found.emoji,
        minutes: found.minutes,
        steps: found.steps,
      }
    : null;
}
