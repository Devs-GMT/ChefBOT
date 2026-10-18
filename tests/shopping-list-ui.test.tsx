import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/kitchen/app-nav";
import { RecipeCard } from "@/components/kitchen/recipe-card";
import { ShoppingList } from "@/components/kitchen/shopping-list";
import { addShoppingItems, clearShoppingList, getShoppingList, toggleShoppingItem } from "@/lib/shopping-list";
import type { Recipe } from "@/shared/recipe-schema";
import { renderWithProviders } from "./render-with-providers";

const RECIPE: Recipe = {
  title: "Garlic Egg Fried Rice",
  emoji: "🍳",
  minutes: 15,
  uses: ["rice", "egg"],
  missing: ["garlic", "fish sauce"],
  steps: ["Cook the rice."],
};

beforeEach(() => {
  window.localStorage.clear();
  clearShoppingList();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Add to shopping list (recipe card)", () => {
  it("adds the missing items and confirms", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipeCard recipe={RECIPE} index={0} />);

    await user.click(screen.getByRole("button", { name: "Add missing to shopping list" }));

    expect(getShoppingList().map((i) => i.name)).toEqual(["garlic", "fish sauce"]);
    expect(screen.getByRole("button", { name: /On your list/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "View list" })).toHaveAttribute("href", "/app/list");
  });

  it("shows the list size in the nav, right after Cook", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <AppNav />
        <RecipeCard recipe={RECIPE} index={0} />
      </>,
    );
    const nav = screen.getByRole("navigation", { name: "ChefBOT app" });
    const labels = within(nav).getAllByRole("link").map((link) => link.textContent);
    expect(labels.slice(1, 3)).toEqual(["Cook", "List"]);

    await user.click(screen.getByRole("button", { name: "Add missing to shopping list" }));
    expect(within(nav).getByRole("link", { name: "List, 2 items" })).toHaveAttribute(
      "href",
      "/app/list",
    );
  });

  it("has no add button when nothing is missing", () => {
    renderWithProviders(<RecipeCard recipe={{ ...RECIPE, missing: [] }} index={0} />);
    expect(screen.queryByRole("button", { name: /shopping list/ })).not.toBeInTheDocument();
  });
});

describe("ShoppingList section", () => {
  it("shows an empty state", () => {
    renderWithProviders(<ShoppingList />);
    expect(screen.getByRole("heading", { name: "Shopping List" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing to buy yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Find a recipe →" })).toHaveAttribute("href", "/app");
  });

  it("lists items added from a card, checks them off and removes checked", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <RecipeCard recipe={RECIPE} index={0} />
        <ShoppingList />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Add missing to shopping list" }));

    const list = screen.getByRole("list", { name: "Items to buy" });
    expect(within(list).getByLabelText("Garlic")).not.toBeChecked();
    expect(within(list).getByLabelText("fish sauce")).toBeInTheDocument();

    await user.click(within(list).getByLabelText("Garlic"));
    // Checked items fold away under their own list at the bottom of the receipt.
    expect(within(list).queryByLabelText("Garlic")).not.toBeInTheDocument();
    const checked = screen.getByRole("list", { name: "Checked items" });
    expect(within(checked).getByLabelText("Garlic")).toBeChecked();
    expect(screen.getByText("1 checked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove checked" }));
    expect(screen.queryByLabelText("Garlic")).not.toBeInTheDocument();
    expect(getShoppingList()).toEqual([{ name: "fish sauce", done: false }]);
  });

  it("copies the list as plain text", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderWithProviders(<RecipeCard recipe={RECIPE} index={0} />);
    await user.click(screen.getByRole("button", { name: "Add missing to shopping list" }));
    renderWithProviders(<ShoppingList />);

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(
      "ChefBOT shopping list\n- [ ] Garlic\n- [ ] fish sauce",
    );
    expect(await screen.findByText(/^Copied/)).toHaveAttribute("role", "status");
  });

  it("offers Share only where the browser supports it", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RecipeCard recipe={RECIPE} index={0} />);
    await user.click(screen.getByRole("button", { name: "Add missing to shopping list" }));

    const { unmount } = renderWithProviders(<ShoppingList />);
    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
    unmount();

    vi.stubGlobal("navigator", { ...navigator, share });
    renderWithProviders(<ShoppingList />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith({
      title: "ChefBOT shopping list",
      text: "ChefBOT shopping list\n- [ ] Garlic\n- [ ] fish sauce",
    });
  });

  it("clears everything", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <RecipeCard recipe={RECIPE} index={0} />
        <ShoppingList />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Add missing to shopping list" }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText(/Nothing to buy yet/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add missing to shopping list" }),
    ).toBeEnabled();
  });
});

describe("Shopping List — receipt", () => {
  it("prints items under food-group headings with a running total", async () => {
    addShoppingItems(["egg", "fish sauce", "rice", "garlic"]);
    toggleShoppingItem("rice");
    renderWithProviders(<ShoppingList />);

    const list = screen.getByRole("list", { name: "Items to buy" });
    const headings = within(list).getAllByRole("heading").map((h) => h.textContent);
    expect(headings).toEqual(["Protein & Fats", "Pantry", "Other"]);
    expect(screen.getByText(/Items 4 · Checked 1/i)).toBeInTheDocument();
  });

  it("prints twelve open items, then the rest on demand", async () => {
    const user = userEvent.setup();
    addShoppingItems(Array.from({ length: 15 }, (_, i) => `thing ${i + 1}`));
    renderWithProviders(<ShoppingList />);

    const list = screen.getByRole("list", { name: "Items to buy" });
    expect(within(list).getAllByRole("checkbox")).toHaveLength(12);
    await user.click(screen.getByRole("button", { name: "Print all · 3 more" }));
    expect(within(list).getAllByRole("checkbox")).toHaveLength(15);
  });
});
