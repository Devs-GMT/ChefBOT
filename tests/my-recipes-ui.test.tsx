import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyRecipes } from "@/components/kitchen/my-recipes";
import { resetMyRecipes, saveMyRecipe } from "@/lib/my-recipes";
import { renderWithProviders } from "./render-with-providers";

const cookButtons = vi.hoisted(() => [] as Array<{ title: string; archive: boolean | undefined }>);

vi.mock("@/components/kitchen/cook-button", () => ({
  CookButton: ({ recipe, archive }: { recipe: { title: string }; archive?: boolean }) => {
    cookButtons.push({ title: recipe.title, archive });
    return <button type="button">I cooked it 🍳</button>;
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  resetMyRecipes();
  cookButtons.length = 0;
});

async function writeRecipe(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.click(screen.getByRole("button", { name: "Write a recipe" }));
  await user.type(screen.getByLabelText("Title"), title);
  await user.clear(screen.getByLabelText("Minutes"));
  await user.type(screen.getByLabelText("Minutes"), "15");
  await user.type(screen.getByLabelText(/Ingredients/), "egg, rice");
  await user.type(screen.getByLabelText(/Steps/), "Cook the rice.{enter}Fry with egg.");
  await user.click(screen.getByRole("button", { name: "Save recipe" }));
}

describe("My Recipes section", () => {
  it("starts empty and says recipes stay in this browser", () => {
    renderWithProviders(<MyRecipes />);
    expect(screen.getByRole("heading", { name: "My Recipes" })).toBeInTheDocument();
    expect(screen.getByText(/Saved only in this browser/)).toBeInTheDocument();
    expect(screen.getByText(/No recipes of your own yet/)).toBeInTheDocument();
  });

  it("shows validation messages and keeps the form open", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyRecipes />);
    await user.click(screen.getByRole("button", { name: "Write a recipe" }));
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Give your recipe a title/);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  it("saves a recipe as a stampable card that is never archived", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyRecipes />);
    await writeRecipe(user, "Nasi Telur Kilat");

    const card = screen.getByRole("heading", { name: /Nasi Telur Kilat/ }).closest("article")!;
    expect(within(card).getByText("15 min")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "I cooked it 🍳" })).toBeInTheDocument();
    expect(cookButtons.at(-1)).toEqual({ title: "Nasi Telur Kilat", archive: false });
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("edits and deletes a saved recipe", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyRecipes />);
    await writeRecipe(user, "Nasi Telur Kilat");

    await user.click(screen.getByRole("button", { name: "Edit Nasi Telur Kilat" }));
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Nasi Telur Super Kilat");
    await user.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(screen.getByRole("heading", { name: /Nasi Telur Super Kilat/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Nasi Telur Super Kilat" }));
    expect(screen.getByText(/No recipes of your own yet/)).toBeInTheDocument();
  });
});

function seed(minutes: number[]) {
  // saveMyRecipe prepends, so seed in reverse to read "Recipe 1" first.
  [...minutes].reverse().forEach((m, i) => {
    const n = minutes.length - i;
    saveMyRecipe({ title: `Recipe ${n}`, emoji: "🍲", minutes: m, uses: ["egg"], missing: [], steps: ["Cook."] });
  });
}

describe("My Recipes — recipe box", () => {
  it("files recipes as index cards and opens one full card at a time", async () => {
    const user = userEvent.setup();
    seed([10, 25, 60]);
    renderWithProviders(<MyRecipes />);

    const box = screen.getByRole("list", { name: "Recipe box" });
    expect(within(box).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Recipe 1, 10 min/ }));
    expect(screen.getByRole("heading", { name: "Recipe 1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Recipe 2, 25 min/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Recipe 2" })).toBeInTheDocument();
  });

  it("filters by cooking time", async () => {
    const user = userEvent.setup();
    seed([10, 15, 25, 60]);
    renderWithProviders(<MyRecipes />);

    await user.click(screen.getByRole("radio", { name: /≤15 min/ }));
    const box = screen.getByRole("list", { name: "Recipe box" });
    expect(within(box).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      expect.stringContaining("Recipe 1"),
      expect.stringContaining("Recipe 2"),
    ]);
    await user.click(screen.getByRole("radio", { name: /30\+ min/ }));
    expect(within(box).getAllByRole("listitem")).toHaveLength(1);
  });

  it("adds a search from seven recipes and shows eight cards before Show more", async () => {
    const user = userEvent.setup();
    seed(Array.from({ length: 10 }, () => 20));
    renderWithProviders(<MyRecipes />);

    const box = screen.getByRole("list", { name: "Recipe box" });
    expect(within(box).getAllByRole("listitem")).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: /Show more \(2 left\)/ }));
    expect(within(box).getAllByRole("listitem")).toHaveLength(10);

    await user.type(screen.getByRole("searchbox", { name: "Search your recipes" }), "recipe 10");
    expect(within(box).getAllByRole("listitem")).toHaveLength(1);
  });

  it("has no search for a small box", () => {
    seed([10, 20]);
    renderWithProviders(<MyRecipes />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
