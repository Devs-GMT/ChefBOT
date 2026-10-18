import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RecipeCard } from "@/components/kitchen/recipe-card";
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
    expect(screen.getByText("Uses 2 of your ingredients")).toBeInTheDocument();
    expect(screen.getByText("rice")).toBeInTheDocument();
    const missing = screen.getByRole("list", { name: "Missing ingredients" });
    expect(missing).toHaveTextContent("garlic");
    expect(missing).toHaveTextContent("butter");
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
    expect(screen.getByRole("list", { name: "Steps" }).tagName).toBe("OL");

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
    expect(
      screen.queryByRole("list", { name: "Missing ingredients" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing missing/)).toBeInTheDocument();
  });
});

describe("RecipeCard — nutrition estimate (v1.1)", () => {
  it("shows the AI estimate with a disclaimer", () => {
    renderWithProviders(
      <RecipeCard recipe={{ ...RECIPE, nutrition: { kcal: 450, proteinG: 20 } }} index={0} />,
    );
    expect(screen.getByText("≈ 450 kcal · 20 g protein")).toBeInTheDocument();
    expect(screen.getByText(/AI estimate per serving/)).toBeInTheDocument();
  });

  it("shows nothing when there is no estimate", () => {
    renderWithProviders(<RecipeCard recipe={RECIPE} index={0} />);
    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument();
  });
});
