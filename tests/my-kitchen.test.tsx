import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyKitchen } from "@/components/kitchen/my-kitchen";
import { contractAddress, fetchDish, fetchMyDishKeys } from "@/lib/contract";
import { renderWithProviders } from "./render-with-providers";

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnection: vi.fn(),
    useConnect: vi.fn(),
    useDisconnect: vi.fn(),
    useSwitchChain: vi.fn(),
  };
});

vi.mock("@/lib/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contract")>();
  return {
    ...actual,
    contractAddress: vi.fn(),
    fetchMyDishKeys: vi.fn(),
    fetchDish: vi.fn(),
  };
});

const { useConnection, useConnect, useDisconnect, useSwitchChain } =
  await import("wagmi");

const ADDRESS = "0x3333333333333333333333333333333333333333" as const;

function mockConnection(isConnected: boolean, address?: string) {
  vi.mocked(useConnection).mockReturnValue({
    isConnected,
    address: isConnected ? (address ?? ADDRESS) : undefined,
    chainId: isConnected ? 677 : undefined,
    status: isConnected ? "connected" : "disconnected",
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConnection).mockReturnValue({
    isConnected: false,
    address: undefined,
    chainId: undefined,
    status: "disconnected",
  } as never);
  vi.mocked(useConnect).mockReturnValue({
    mutateAsync: vi.fn(),
    connectors: [{ id: "metaMask", name: "MetaMask" }],
    isPending: false,
  } as never);
  vi.mocked(useDisconnect).mockReturnValue({ mutateAsync: vi.fn() } as never);
  vi.mocked(useSwitchChain).mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(contractAddress).mockReturnValue(ADDRESS);
});

describe("MyKitchen", () => {
  it("shows the deployment notice without a contract address", () => {
    vi.mocked(contractAddress).mockReturnValue(null);
    renderWithProviders(<MyKitchen />);
    expect(
      screen.getByText(/Your kitchen opens after deployment/),
    ).toBeInTheDocument();
  });

  it("asks the user to connect when disconnected", () => {
    renderWithProviders(<MyKitchen />);
    expect(screen.getByText(/No wallet connected yet/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Connect wallet" }),
    ).toBeInTheDocument();
    expect(fetchMyDishKeys).not.toHaveBeenCalled();
  });

  it("shows the empty state for a wallet with no stamps", async () => {
    vi.mocked(fetchMyDishKeys).mockResolvedValue([]);
    mockConnection(true);
    renderWithProviders(<MyKitchen />);
    expect(await screen.findByText(/Nothing stamped yet/)).toBeInTheDocument();
  });

  it("lists stamped dishes for the connected wallet", async () => {
    vi.mocked(fetchMyDishKeys).mockResolvedValue(["0xaa", "0xbb"]);
    vi.mocked(fetchDish).mockImplementation(async (key) => {
      if (key === "0xaa") {
        return { title: "Fried Rice", emoji: "🍳", cooks: 3 };
      }
      return { title: "Ramen", emoji: "🍜", cooks: 1 };
    });
    mockConnection(true);
    renderWithProviders(<MyKitchen />);

    expect(await screen.findByText(/Fried Rice/)).toBeInTheDocument();
    expect(screen.getByText(/Ramen/)).toBeInTheDocument();
    expect(screen.getByText("3 cooks")).toBeInTheDocument();
    expect(fetchMyDishKeys).toHaveBeenCalledWith(ADDRESS);
    await waitFor(() => expect(fetchDish).toHaveBeenCalledTimes(2));
  });

  it("shows an error state with retry when the chain read fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchMyDishKeys)
      .mockRejectedValueOnce(new Error("rpc down"))
      .mockResolvedValueOnce([]);
    mockConnection(true);
    renderWithProviders(<MyKitchen />);

    expect(
      await screen.findByText(/Could not load your kitchen/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/Nothing stamped yet/)).toBeInTheDocument();
  });
});

describe("MyKitchen — passport", () => {
  function stampMany(count: number) {
    const keys = Array.from({ length: count }, (_, i) => `0x${(i + 1).toString(16).padStart(2, "0")}`);
    vi.mocked(fetchMyDishKeys).mockResolvedValue(keys as never);
    vi.mocked(fetchDish).mockImplementation(async (key) => ({
      title: `Dish ${parseInt(String(key), 16)}`,
      emoji: "🍲",
      cooks: 2,
    }));
    mockConnection(true);
  }

  it("shows twelve stamps per page and pages through the rest", async () => {
    const user = userEvent.setup();
    stampMany(15);
    renderWithProviders(<MyKitchen />);

    const page = await screen.findByRole("list", { name: "Passport page 1 of 2" });
    expect(within(page).getAllByRole("listitem")).toHaveLength(12);
    const prev = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });
    expect(prev).toBeDisabled();

    await user.click(next);
    const second = screen.getByRole("list", { name: "Passport page 2 of 2" });
    expect(within(second).getAllByRole("listitem")).toHaveLength(3);
    expect(second).toHaveTextContent("Dish 13");
    expect(next).toBeDisabled();
    expect(prev).toBeEnabled();
  });

  it("sums the passport stats", async () => {
    stampMany(5);
    renderWithProviders(<MyKitchen />);
    const stats = await screen.findByRole("list", { name: "Passport stats" });
    expect(stats).toHaveTextContent("5Dishes stamped");
    expect(stats).toHaveTextContent("10Cooks on your dishes");
  });

  it("hides the pager when everything fits on one page", async () => {
    stampMany(3);
    renderWithProviders(<MyKitchen />);
    await screen.findByRole("list", { name: "Passport page 1 of 1" });
    expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  });
});
