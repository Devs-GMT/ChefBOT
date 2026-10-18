import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import KitchenPage from "@/app/app/kitchen/page";
import LeaderboardPage from "@/app/app/leaderboard/page";
import ListPage from "@/app/app/list/page";
import RecipesPage from "@/app/app/recipes/page";
import { renderWithProviders } from "./render-with-providers";

vi.mock("@/lib/contract", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contract")>()),
  contractAddress: () => null,
}));

describe("kitchen pages", () => {
  it.each([
    [ListPage, "Shopping List"],
    [RecipesPage, "My Recipes"],
    [LeaderboardPage, "Most Cooked"],
    [KitchenPage, "My Kitchen"],
  ])("renders its section as the page heading", (Page, heading) => {
    renderWithProviders(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });
});
