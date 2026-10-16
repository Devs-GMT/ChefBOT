import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Leaderboard } from "@/components/leaderboard";
import { contractAddress, fetchDishes } from "@/lib/contract";
import { renderWithProviders } from "./render-with-providers";

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
    expect(screen.getByText("5 cooks")).toBeInTheDocument();
    expect(screen.getByText("3 cooks")).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ramen");
    expect(items[1]).toHaveTextContent("Fried Rice");
  });

  it("shows the empty state", async () => {
    vi.mocked(contractAddress).mockReturnValue(ADDRESS);
    vi.mocked(fetchDishes).mockResolvedValue([]);
    renderWithProviders(<Leaderboard />);
    expect(await screen.findByText(/No dishes stamped yet/)).toBeInTheDocument();
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
