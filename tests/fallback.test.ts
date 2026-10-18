import { describe, expect, it } from "vitest";

import { ALL_INGREDIENT_IDS } from "@/lib/ingredients";
import {
  curatedRecipeCount,
  findCuratedRecipe,
  selectFallbackRecipes,
} from "@/lib/fallback";
import type { RecipeRequest } from "@/shared/recipe-schema";

function request(overrides: Partial<RecipeRequest> = {}): RecipeRequest {
  return {
    ingredients: ["egg", "rice", "garlic"],
    maxMinutes: 20,
    vegetarian: false,
    ...overrides,
  };
}

describe("selectFallbackRecipes", () => {
  it("always returns exactly three recipes", () => {
    const recipes = selectFallbackRecipes(request());
    expect(recipes).toHaveLength(3);
  });

  it("provides at least 25 curated recipes", () => {
    expect(curatedRecipeCount()).toBeGreaterThanOrEqual(25);
  });

  it("ranks recipes by ingredient overlap", () => {
    const recipes = selectFallbackRecipes(
      request({ ingredients: ["rice", "egg", "garlic", "soy sauce"] }),
    );
    expect(recipes[0].title).toBe("Garlic Egg Fried Rice");
    expect(recipes[0].uses).toEqual(
      expect.arrayContaining(["rice", "egg", "garlic"]),
    );
  });

  it("fills uses and missing from the selection", () => {
    const recipes = selectFallbackRecipes(
      request({ ingredients: ["rice", "egg"] }),
    );
    const friedRice = recipes.find((r) => r.title === "Garlic Egg Fried Rice");
    if (friedRice) {
      expect(friedRice.uses).toEqual(["rice", "egg"]);
      expect(friedRice.missing).toEqual(
        expect.arrayContaining(["garlic", "soy sauce", "butter"]),
      );
      expect(friedRice.uses).not.toEqual(
        expect.arrayContaining(["butter"]),
      );
    }
  });

  it("honours the vegetarian preference", () => {
    const recipes = selectFallbackRecipes(
      request({ vegetarian: true, ingredients: ["rice", "chicken breast"] }),
    );
    expect(recipes).toHaveLength(3);
    // With overlap only on rice, all picks must still be vegetarian.
    for (const recipe of recipes) {
      expect(recipe.title).not.toMatch(/Chicken|Beef|Bacon|Shrimp|Salmon|Tacos/);
    }
  });

  it("respects the cooking-time limit when possible", () => {
    const recipes = selectFallbackRecipes(
      request({ maxMinutes: 10, ingredients: ["bread", "cheese", "butter"] }),
    );
    expect(recipes).toHaveLength(3);
    expect(recipes[0].minutes).toBeLessThanOrEqual(10);
    for (const recipe of recipes) {
      expect(recipe.minutes).toBeLessThanOrEqual(10);
    }
  });

  it("relaxes filters instead of returning fewer than three", () => {
    // "flour", "vinegar", and "sugar" appear in no curated recipe:
    // the matcher must still pad out three results.
    const recipes = selectFallbackRecipes(
      request({ ingredients: ["flour", "vinegar"], vegetarian: true }),
    );
    expect(recipes).toHaveLength(3);
    for (const recipe of recipes) {
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.title.length).toBeGreaterThan(0);
    }
  });

  it("keeps steps within the eight-step cap and non-empty", () => {
    const recipes = selectFallbackRecipes(request());
    for (const recipe of recipes) {
      expect(recipe.steps.length).toBeGreaterThanOrEqual(1);
      expect(recipe.steps.length).toBeLessThanOrEqual(8);
      for (const step of recipe.steps) {
        expect(step.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("only references canonical ingredient ids in uses/missing", () => {
    const valid = new Set(ALL_INGREDIENT_IDS);
    const recipes = selectFallbackRecipes(request());
    for (const recipe of recipes) {
      for (const id of [...recipe.uses, ...recipe.missing]) {
        expect(valid.has(id)).toBe(true);
      }
    }
  });
});

describe("selectFallbackRecipes — rotation for \"New ideas\"", () => {
  it("skips titles already shown while the pool allows", () => {
    const shown: string[] = [];
    for (let round = 0; round < 3; round++) {
      const recipes = selectFallbackRecipes(request(), 3, shown);
      expect(recipes).toHaveLength(3);
      for (const recipe of recipes) {
        expect(shown).not.toContain(recipe.title);
        shown.push(recipe.title);
      }
    }
    expect(new Set(shown).size).toBe(9);
  });

  it("matches excluded titles case-insensitively", () => {
    const first = selectFallbackRecipes(request()).map((r) => r.title);
    const next = selectFallbackRecipes(request(), 3, first.map((t) => t.toUpperCase()));
    expect(next.map((r) => r.title)).not.toContain(first[0]);
  });

  it("starts over once every candidate has been shown", () => {
    const all = selectFallbackRecipes(request(), curatedRecipeCount()).map((r) => r.title);
    const recipes = selectFallbackRecipes(request(), 3, all);
    expect(recipes.map((r) => r.title)).toEqual(selectFallbackRecipes(request()).map((r) => r.title));
  });
});

describe("selectFallbackRecipes — narrow filters", () => {
  function rounds(req: RecipeRequest, count: number) {
    const shown: string[] = [];
    const all: string[][] = [];
    for (let i = 0; i < count; i++) {
      const titles = selectFallbackRecipes(req, 3, shown).map((r) => r.title);
      all.push(titles);
      shown.push(...titles);
    }
    return all;
  }

  it("relaxes the time limit before repeating a dish", () => {
    // Only 6 vegetarian recipes fit 10 minutes: rounds 3+ must still be new.
    const all = rounds(request({ maxMinutes: 10, vegetarian: true }), 4).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps the in-time dishes first", () => {
    const [first] = rounds(request({ maxMinutes: 10, vegetarian: true }), 1);
    const minutes = selectFallbackRecipes(request({ maxMinutes: 10, vegetarian: true })).map((r) => r.minutes);
    expect(first).toHaveLength(3);
    expect(minutes.every((m) => m <= 10)).toBe(true);
  });

  it("never relaxes vegetarian, however many rounds", () => {
    const vegTitles = new Set(
      selectFallbackRecipes(request({ vegetarian: true, maxMinutes: 30 }), 99).map((r) => r.title),
    );
    for (const titles of rounds(request({ maxMinutes: 10, vegetarian: true }), 8)) {
      for (const title of titles) expect(vegTitles.has(title)).toBe(true);
    }
  });
});

describe("findCuratedRecipe", () => {
  it("finds a cookbook recipe by its normalized on-chain title", () => {
    const found = findCuratedRecipe("  GARLIC egg fried rice ");
    expect(found?.title).toBe("Garlic Egg Fried Rice");
    expect(found?.steps.length).toBeGreaterThan(0);
  });

  it("returns null for dishes outside the cookbook", () => {
    expect(findCuratedRecipe("Mystery Stew")).toBeNull();
  });
});
