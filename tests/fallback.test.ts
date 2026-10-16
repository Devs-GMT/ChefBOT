import { describe, expect, it } from "vitest";

import { ALL_INGREDIENT_IDS } from "@/lib/ingredients";
import { curatedRecipeCount, selectFallbackRecipes } from "@/lib/fallback";
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
