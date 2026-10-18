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
 * Best `limit` candidates, skipping already-shown titles while enough
 * unseen ones remain; once the pool is exhausted it starts over.
 */
function pick(
  candidates: Scored[],
  selected: string[],
  limit: number,
  shown: Set<string>,
): Recipe[] {
  const ranked = rank(candidates);
  const fresh = ranked.filter((s) => !shown.has(normalizeTitle(s.curated.title)));
  const chosen = fresh.length >= limit ? fresh : ranked;
  return chosen.slice(0, limit).map((s) => toRecipe(s.curated, selected));
}

/**
 * Local fallback matcher — the "House favourites" source.
 *
 * Returns exactly `limit` recipes (3) whenever the curated pool is large
 * enough, relaxing filters in order:
 *   1. vegetarian + within time + ingredient overlap
 *   2. vegetarian + overlap
 *   3. any overlap
 * Results are sorted by ingredient overlap, then shortest cooking time.
 * `exclude` lists titles already shown ("New ideas"), so the pool rotates.
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

  const veg = scored.filter((s) =>
    request.vegetarian ? s.curated.vegetarian : true,
  );
  const pools: Scored[][] = [
    veg.filter((s) => s.curated.minutes <= request.maxMinutes),
    veg,
    scored,
  ];

  for (const pool of pools) {
    const recipes = pick(pool, request.ingredients, limit, shown);
    if (recipes.length === limit) return recipes;
  }

  return pick(scored, request.ingredients, limit, shown);
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
