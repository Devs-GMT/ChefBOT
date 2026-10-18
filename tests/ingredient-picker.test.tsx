import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IngredientPicker, ingredientEmoji } from "@/components/kitchen/ingredient-picker";
import { ALL_INGREDIENT_IDS } from "@/lib/ingredients";

describe("IngredientPicker", () => {
  it("groups ingredients into food-group tabs", () => {
    render(<IngredientPicker selected={[]} onToggle={() => {}} />);
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs.join(" ")).toMatch(/Protein & Fats/);
    expect(tabs.join(" ")).toMatch(/Vegetables & Fruits/);
    expect(tabs.join(" ")).toMatch(/Grains/);
    expect(tabs.join(" ")).toMatch(/Pantry/);
    expect(screen.getByRole("tab", { name: /Protein & Fats/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Egg" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rice" })).not.toBeInTheDocument();
  });

  it("switches panels by click and by arrow keys", async () => {
    const user = userEvent.setup();
    render(<IngredientPicker selected={[]} onToggle={() => {}} />);

    await user.click(screen.getByRole("tab", { name: /Grains/ }));
    expect(screen.getByRole("button", { name: "Rice" })).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Pantry/ })).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Peanut butter" }),
    ).toBeInTheDocument();
  });

  it("marks selected chips with aria-pressed and counts them per tab", () => {
    render(<IngredientPicker selected={["egg", "rice"]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Egg" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Tofu" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("tab", { name: /Grains/ })).toHaveTextContent("1");
  });

  it("reports toggles to the parent", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<IngredientPicker selected={[]} onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: "Tofu" }));
    expect(onToggle).toHaveBeenCalledWith("tofu");
  });
});

describe("ingredientEmoji", () => {
  it("has a glyph for every vocabulary id", () => {
    const missing = ALL_INGREDIENT_IDS.filter((id) => ingredientEmoji(id) === "•");
    expect(missing).toEqual([]);
  });
});
