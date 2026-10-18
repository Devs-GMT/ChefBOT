import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/kitchen/app-nav";
import { RecipeCard } from "@/components/kitchen/recipe-card";
import { ShoppingList } from "@/components/kitchen/shopping-list";
import { clearShoppingList, getShoppingList } from "@/lib/shopping-list";
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
    expect(screen.getByRole("link", { name: "View list" })).toHaveAttribute("href", "#shopping-list");
  });

  it("points the app pill nav home (the workspace tabs carry the list count)", () => {
    renderWithProviders(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "ChefBOT app" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
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
    expect(within(list).getByLabelText("Garlic")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Remove checked" }));
    expect(within(list).queryByLabelText("Garlic")).not.toBeInTheDocument();
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
