import { screen, waitFor } from "@testing-library/react";
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
