import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_MY_RECIPES,
  MY_RECIPES_KEY,
  deleteMyRecipe,
  draftToRecipe,
  getMyRecipes,
  resetMyRecipes,
  saveMyRecipe,
  type RecipeDraft,
} from "@/lib/my-recipes";

const DRAFT: RecipeDraft = {
  title: "  Grandma's Sambal Eggs ",
  emoji: "",
  minutes: "25",
  ingredients: "Egg, chili, shallot, , garlic",
  steps: "Boil the eggs.\n\n  Blend chili, shallot and garlic.  \nFry the paste and toss the eggs.",
};

beforeEach(() => {
  window.localStorage.clear();
  resetMyRecipes();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("draftToRecipe", () => {
  it("turns the form into a recipe: trimmed, default emoji, one step per line", () => {
    const result = draftToRecipe(DRAFT);
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Grandma's Sambal Eggs",
        emoji: "🍳",
        minutes: 25,
        uses: ["egg", "chili", "shallot", "garlic"],
        missing: [],
        steps: ["Boil the eggs.", "Blend chili, shallot and garlic.", "Fry the paste and toss the eggs."],
      },
    });
  });

  it.each([
    ["no title", { title: "  " }, /Give your recipe a title/],
    ["title too long", { title: "x".repeat(65) }, /Title is too long/],
    ["no steps", { steps: " \n " }, /Add at least one step/],
    ["too many steps", { steps: Array.from({ length: 9 }, (_, i) => `Step ${i}`).join("\n") }, /At most 8 steps/],
    ["step too long", { steps: "y".repeat(301) }, /Each step must be 300 characters or less/],
    ["bad minutes", { minutes: "0" }, /Cooking time must be 1–180 minutes/],
    ["minutes not a number", { minutes: "soon" }, /Cooking time must be 1–180 minutes/],
    ["emoji too long", { emoji: "🍳🍳🍳🍳🍳" }, /Use a single emoji/],
  ])("explains a bad draft (%s)", (_label, patch, message) => {
    const result = draftToRecipe({ ...DRAFT, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(message);
  });
});

describe("my recipes store", () => {
  it("saves, lists and persists under a versioned key", () => {
    const recipe = draftToRecipe(DRAFT);
    if (!recipe.ok) throw new Error("draft");
    expect(saveMyRecipe(recipe.value)).toEqual({ ok: true });
    expect(getMyRecipes().map((r) => r.title)).toEqual(["Grandma's Sambal Eggs"]);
    expect(JSON.parse(window.localStorage.getItem(MY_RECIPES_KEY) ?? "[]")).toHaveLength(1);
  });

  it("refuses a second recipe with the same dish title (case-insensitive)", () => {
    const recipe = draftToRecipe(DRAFT);
    if (!recipe.ok) throw new Error("draft");
    saveMyRecipe(recipe.value);
    const again = saveMyRecipe({ ...recipe.value, title: "grandma's sambal eggs" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toMatch(/already have a recipe called/);
  });

  it("edits in place, including a rename", () => {
    const recipe = draftToRecipe(DRAFT);
    if (!recipe.ok) throw new Error("draft");
    saveMyRecipe(recipe.value);
    expect(saveMyRecipe({ ...recipe.value, title: "Sambal Eggs" }, "Grandma's Sambal Eggs")).toEqual({ ok: true });
    expect(getMyRecipes().map((r) => r.title)).toEqual(["Sambal Eggs"]);
  });

  it("deletes by title", () => {
    const recipe = draftToRecipe(DRAFT);
    if (!recipe.ok) throw new Error("draft");
    saveMyRecipe(recipe.value);
    deleteMyRecipe("GRANDMA'S SAMBAL EGGS");
    expect(getMyRecipes()).toEqual([]);
  });

  it("caps the collection", () => {
    for (let i = 0; i < MAX_MY_RECIPES; i++) {
      const r = draftToRecipe({ ...DRAFT, title: `Dish ${i}` });
      if (r.ok) saveMyRecipe(r.value);
    }
    const extra = draftToRecipe({ ...DRAFT, title: "One too many" });
    if (!extra.ok) throw new Error("draft");
    const result = saveMyRecipe(extra.value);
    expect(result.ok).toBe(false);
    expect(getMyRecipes()).toHaveLength(MAX_MY_RECIPES);
  });

  it("ignores corrupt or invalid stored data", () => {
    window.localStorage.setItem(MY_RECIPES_KEY, JSON.stringify([{ title: "" }, "x", { ...DRAFT }]));
    resetMyRecipes();
    expect(getMyRecipes()).toEqual([]);
    window.localStorage.setItem(MY_RECIPES_KEY, "{oops");
    resetMyRecipes();
    expect(getMyRecipes()).toEqual([]);
  });

  it("keeps working in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const recipe = draftToRecipe(DRAFT);
    if (!recipe.ok) throw new Error("draft");
    expect(saveMyRecipe(recipe.value)).toEqual({ ok: true });
    expect(getMyRecipes()).toHaveLength(1);
  });
});
