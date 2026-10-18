import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Leaderboard } from "@/components/kitchen/leaderboard";
import { contractAddress, fetchDishes } from "@/lib/contract";
import { fetchArchivedDish } from "@/lib/dish-archive";
import { renderWithProviders } from "./render-with-providers";

vi.mock("@/lib/dish-archive", () => ({ fetchArchivedDish: vi.fn().mockResolvedValue(null) }));

vi.mock("@/lib/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contract")>();
  return {
    ...actual,
    contractAddress: vi.fn(),
    fetchDishes: vi.fn(),
  };
});

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;

beforeEach(() => {
  vi.mocked(contractAddress).mockReset();
  vi.mocked(fetchDishes).mockReset();
});

describe("Leaderboard", () => {
  it("shows the not-configured notice without a contract address", async () => {
    vi.mocked(contractAddress).mockReturnValue(null);
    renderWithProviders(<Leaderboard />);
    expect(
      await screen.findByText(/On-chain leaderboard is not live yet/),
    ).toBeInTheDocument();
    expect(fetchDishes).not.toHaveBeenCalled();
  });

  it("lists dishes sorted by cooks with bar widths", async () => {
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue([
      { key: "0x01", title: "Fried Rice", emoji: "🍳", cooks: 3 },
      { key: "0x02", title: "Ramen", emoji: "🍜", cooks: 5 },
    ]);

    renderWithProviders(<Leaderboard />);
    expect(await screen.findByText(/Ramen/)).toBeInTheDocument();
    expect(screen.getByText(/Fried Rice/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ramen, 5 cooks" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fried Rice, 3 cooks" })).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ramen");
    expect(items[1]).toHaveTextContent("Fried Rice");
  });

  it("shows the empty state", async () => {
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue([]);
    renderWithProviders(<Leaderboard />);
    expect(await screen.findByText(/No dishes stamped yet/)).toBeInTheDocument();
    expect(screen.getByText(/Be the first to cook something/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "pick your ingredients" })).toHaveAttribute("href", "/app");
  });

  it("opens a dish when its bar is tapped, with cookbook steps when known", async () => {
    const user = userEvent.setup();
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue([
      { key: "0x01", title: "garlic egg fried rice", emoji: "🍳", cooks: 7 },
      { key: "0x02", title: "Mystery Stew", emoji: "🍲", cooks: 2 },
    ]);
    renderWithProviders(<Leaderboard />);

    const bar = await screen.findByRole("button", {
      name: /garlic egg fried rice, 7 cooks/i,
    });
    expect(bar).toHaveAttribute("aria-expanded", "false");
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-expanded", "true");

    const detail = screen.getByRole("region", { name: /garlic egg fried rice/i });
    expect(detail).toHaveTextContent("#1 most cooked");
    expect(screen.getByRole("list", { name: "Steps" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mystery Stew, 2 cooks/ }));
    expect(screen.queryByRole("list", { name: "Steps" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /Mystery Stew/ }),
    ).toHaveTextContent(/steps stay in the app/i);
    expect(screen.getByRole("link", { name: /Ask ChefBOT for your own version/ })).toHaveAttribute("href", "/app");
  });

  it("shows archived steps for dishes that are not in the cookbook", async () => {
    const user = userEvent.setup();
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue([
      { key: "0x02", title: "Mystery Stew", emoji: "🍲", cooks: 2 },
    ]);
    vi.mocked(fetchArchivedDish).mockResolvedValueOnce({
      title: "Mystery Stew",
      emoji: "🍲",
      minutes: 25,
      uses: [],
      missing: [],
      steps: ["Brown the onions.", "Simmer everything."],
    });
    renderWithProviders(<Leaderboard />);

    await user.click(await screen.findByRole("button", { name: /Mystery Stew, 2 cooks/ }));
    const steps = await screen.findByRole("list", { name: "Steps" });
    expect(steps).toHaveTextContent("Simmer everything.");
    expect(screen.getByRole("region", { name: /Mystery Stew/ })).toHaveTextContent("25 min");
    expect(fetchArchivedDish).toHaveBeenCalledWith("Mystery Stew");
  });

  it("shows an error state with a working retry", async () => {
    const user = userEvent.setup();
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes)
      .mockRejectedValueOnce(new Error("rpc down"))
      .mockResolvedValueOnce([
        { key: "0x03", title: "Curry", emoji: "🍛", cooks: 1 },
      ]);

    renderWithProviders(<Leaderboard />);
    expect(await screen.findByText(/Could not reach BOT Chain/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/Curry/)).toBeInTheDocument();
    expect(fetchDishes).toHaveBeenCalledTimes(2);
  });
});

function manyDishes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: `0x${(i + 1).toString(16).padStart(2, "0")}` as const,
    title: `Dish ${i + 1}`,
    emoji: "🍲",
    cooks: count - i,
  }));
}

describe("Leaderboard — podium and ladder", () => {
  it("puts the top three on a podium (#2, #1, #3 left to right) and the rest on the ladder", async () => {
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue(manyDishes(6));
    renderWithProviders(<Leaderboard />);

    const podium = await screen.findByRole("list", { name: "Top 3" });
    const steps = within(podium).getAllByRole("listitem");
    expect(steps.map((li) => li.dataset.rank)).toEqual(["1", "2", "3"]);
    expect(steps.map((li) => li.style.order)).toEqual(["2", "1", "3"]);
    expect(steps[0]).toHaveTextContent("Dish 1");

    const ladder = screen.getByRole("list", { name: "Rank 4 and below" });
    const rows = within(ladder).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("#4");
    expect(rows[0]).toHaveTextContent("Dish 4");
  });

  it("shows eight ladder rows, then more on demand, with a search for long lists", async () => {
    const user = userEvent.setup();
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue(manyDishes(30));
    renderWithProviders(<Leaderboard />);

    const ladder = await screen.findByRole("list", { name: "Rank 4 and below" });
    expect(within(ladder).getAllByRole("listitem")).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: /Show more \(19 left\)/ }));
    expect(within(ladder).getAllByRole("listitem")).toHaveLength(16);

    await user.type(screen.getByRole("searchbox", { name: "Find a dish" }), "dish 2");
    const found = within(ladder).getAllByRole("listitem");
    // Dish 2 sits on the podium; the ladder lists Dish 20–29 with their real ranks.
    expect(found).toHaveLength(8);
    expect(found[0]).toHaveTextContent("#20");
  });

  it("opens a ladder dish when its row is tapped", async () => {
    const user = userEvent.setup();
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue(manyDishes(5));
    renderWithProviders(<Leaderboard />);

    await user.click(await screen.findByRole("button", { name: /Dish 5, 1 cook$/ }));
    expect(screen.getByRole("region", { name: "Dish 5" })).toHaveTextContent("#5 most cooked");
  });
});
