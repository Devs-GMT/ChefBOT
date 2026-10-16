import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CookFlow } from "@/components/cook-flow";
import { getRecipes } from "@/lib/recipes";
import { renderWithProviders } from "./render-with-providers";
import type { RecipeResult } from "@/lib/recipes";

vi.mock("@/lib/recipes", () => ({
  getRecipes: vi.fn(),
}));

const AI_RESULT: RecipeResult = {
  source: "ai",
  recipes: [
    {
      title: "Garlic Egg Fried Rice",
      emoji: "🍳",
      minutes: 15,
      uses: ["rice", "egg"],
      missing: ["garlic"],
      steps: ["Cook the rice.", "Fry garlic and egg.", "Toss and serve."],
    },
    {
      title: "Tomato Omelette",
      emoji: "🍳",
      minutes: 10,
      uses: ["egg", "tomato"],
      missing: ["butter"],
      steps: ["Beat the eggs.", "Cook with tomato."],
    },
    {
      title: "Peanut Butter Noodles",
      emoji: "🍜",
      minutes: 12,
      uses: ["noodle", "peanut butter"],
      missing: ["chili"],
      steps: ["Boil the noodles.", "Mix the sauce.", "Toss and serve."],
    },
  ],
};

const FALLBACK_RESULT: RecipeResult = {
  source: "fallback",
  fallbackReason: "timeout",
  recipes: AI_RESULT.recipes,
};

beforeEach(() => {
  vi.mocked(getRecipes).mockReset();
});

describe("CookFlow", () => {
  it("keeps the submit button disabled below two ingredients", () => {
    renderWithProviders(<CookFlow />);
    const submit = screen.getByRole("button", { name: "Find recipes" });
    expect(submit).toBeDisabled();
    expect(
      screen.getByText("Pick at least 2 ingredients to continue."),
    ).toBeInTheDocument();
  });

  it("requests recipes and renders the AI result", async () => {
    const user = userEvent.setup();
    vi.mocked(getRecipes).mockResolvedValue(AI_RESULT);

    renderWithProviders(<CookFlow />);
    await user.click(screen.getByRole("button", { name: "Egg" }));
    await user.click(screen.getByRole("button", { name: "Rice" }));
    await user.click(screen.getByRole("button", { name: "Find recipes" }));

    expect(vi.mocked(getRecipes)).toHaveBeenCalledWith({
      ingredients: ["egg", "rice"],
      maxMinutes: 20,
      vegetarian: false,
    });

    expect(
      await screen.findByRole("heading", { name: /Tonight's picks/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Garlic Egg Fried Rice/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/House favourites/)).not.toBeInTheDocument();
  });

  it("labels fallback results as House favourites", async () => {
    const user = userEvent.setup();
    vi.mocked(getRecipes).mockResolvedValue(FALLBACK_RESULT);

    renderWithProviders(<CookFlow />);
    await user.click(screen.getByRole("button", { name: "Egg" }));
    await user.click(screen.getByRole("button", { name: "Rice" }));
    await user.click(screen.getByRole("button", { name: "Find recipes" }));

    expect(await screen.findByText(/House favourites/)).toBeInTheDocument();
  });

  it("sends the selected time and vegetarian preference", async () => {
    const user = userEvent.setup();
    vi.mocked(getRecipes).mockResolvedValue(AI_RESULT);

    renderWithProviders(<CookFlow />);
    await user.click(screen.getByRole("button", { name: "Egg" }));
    await user.click(screen.getByRole("button", { name: "Rice" }));
    await user.click(screen.getByRole("radio", { name: "10 min" }));
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Find recipes" }));

    expect(vi.mocked(getRecipes)).toHaveBeenCalledWith({
      ingredients: ["egg", "rice"],
      maxMinutes: 10,
      vegetarian: true,
    });
  });
});
