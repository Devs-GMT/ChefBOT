import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IngredientMosaic } from "@/components/landing/ingredient-mosaic";
import { ALL_INGREDIENT_IDS, INGREDIENT_GROUPS } from "@/lib/ingredients";

describe("IngredientMosaic", () => {
  it("tiles every ingredient ChefBOT knows, grouped by food group", () => {
    render(<IngredientMosaic />);
    for (const group of INGREDIENT_GROUPS) {
      const list = screen.getByRole("list", { name: group.title });
      expect(within(list).getAllByRole("listitem")).toHaveLength(group.ingredients.length);
    }
    expect(screen.getAllByRole("link")).toHaveLength(ALL_INGREDIENT_IDS.length);
  });

  it("links each tile into the kitchen with a readable label", () => {
    render(<IngredientMosaic />);
    const egg = screen.getByRole("link", { name: "Egg" });
    expect(egg).toHaveAttribute("href", "/app#cook");
    expect(screen.getByText("62 ingredients")).toBeInTheDocument();
  });
});
