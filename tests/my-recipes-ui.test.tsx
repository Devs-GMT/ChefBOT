import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyRecipes } from "@/components/kitchen/my-recipes";
import { resetMyRecipes } from "@/lib/my-recipes";
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
