import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/kitchen/app-nav";
import { renderWithProviders } from "./render-with-providers";

const pathname = vi.hoisted(() => ({ current: "/app" }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  window.localStorage.clear();
});

describe("AppNav — one page per part of the kitchen", () => {
  it("links every page by route", () => {
    renderWithProviders(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "ChefBOT app" });
    const links = within(nav)
      .getAllByRole("link")
      .slice(1)
      .map((link) => [link.textContent, link.getAttribute("href")]);
    expect(links).toEqual([
      ["Cook", "/app"],
      ["List", "/app/list"],
      ["Mine", "/app/recipes"],
      ["Most Cooked", "/app/leaderboard"],
      ["My Kitchen", "/app/kitchen"],
    ]);
  });

  it("marks the current page", () => {
    pathname.current = "/app/leaderboard";
    renderWithProviders(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "ChefBOT app" });
    expect(within(nav).getByRole("link", { name: "Most Cooked" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Cook" })).not.toHaveAttribute("aria-current");
  });

  it("treats /app as Cook only on the exact path", () => {
    pathname.current = "/app";
    renderWithProviders(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "ChefBOT app" });
    expect(within(nav).getByRole("link", { name: "Cook" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getAllByRole("link").filter((l) => l.getAttribute("aria-current"))).toHaveLength(1);
  });
});
