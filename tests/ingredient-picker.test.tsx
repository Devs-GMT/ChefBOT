import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IngredientPicker } from "@/components/ingredient-picker";

describe("IngredientPicker", () => {
  it("renders every ingredient from every group", () => {
    render(<IngredientPicker selected={[]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Egg" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rice" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Peanut butter" }),
    ).toBeInTheDocument();
  });

  it("marks selected chips with aria-pressed", () => {
    render(<IngredientPicker selected={["egg", "rice"]} onToggle={() => {}} />);
    expect(screen.getByRole("button", { name: "Egg" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Garlic" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports toggles to the parent", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<IngredientPicker selected={[]} onToggle={onToggle} />);

    await user.click(screen.getByRole("button", { name: "Tofu" }));
    expect(onToggle).toHaveBeenCalledWith("tofu");
  });
});
