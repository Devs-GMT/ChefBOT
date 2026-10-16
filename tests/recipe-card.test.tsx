import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RecipeCard } from "@/components/recipe-card";
import type { Recipe } from "@/shared/recipe-schema";
import { renderWithProviders } from "./render-with-providers";

const RECIPE: Recipe = {
  title: "Garlic Egg Fried Rice",
  emoji: "🍳",
  minutes: 15,
  uses: ["rice", "egg"],
  missing: ["garlic", "butter"],
  steps: ["Cook the rice.", "Fry garlic and egg.", "Toss and serve."],
};

describe("RecipeCard", () => {
  it("shows title, minutes, uses, and missing items", () => {
    renderWithProviders(<RecipeCard recipe={RECIPE} index={0} />);
    expect(
      screen.getByRole("heading", { name: /Garlic Egg Fried Rice/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.getByText("rice")).toBeInTheDocument();
    expect(screen.getByText(/Missing: garlic, butter/)).toBeInTheDocument();
  });

  it("toggles the steps disclosure", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipeCard recipe={RECIPE} index={0} />);

    const button = screen.getByRole("button", { name: /Show steps \(3\)/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Cook the rice.")).not.toBeInTheDocument();

    await user.click(button);
    expect(
      screen.getByRole("button", { name: /Hide steps/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Cook the rice.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hide steps/ }));
    expect(screen.queryByText("Cook the rice.")).not.toBeInTheDocument();
  });

  it("hides the missing row when nothing is missing", () => {
    renderWithProviders(
      <RecipeCard
        recipe={{ ...RECIPE, missing: [], title: "Rice Bowl" }}
        index={1}
      />,
    );
    expect(screen.queryByText(/Missing:/)).not.toBeInTheDocument();
  });
});
