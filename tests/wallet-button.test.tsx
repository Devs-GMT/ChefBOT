import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WalletButton } from "@/components/wallet-button";
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

const { useConnection, useConnect, useDisconnect, useSwitchChain } =
  await import("wagmi");

const connectAsync = vi.fn().mockResolvedValue(undefined);
const disconnectAsync = vi.fn().mockResolvedValue(undefined);
const switchChainAsync = vi.fn().mockResolvedValue(undefined);

function mockConnected(overrides: Record<string, unknown> = {}) {
  vi.mocked(useConnection).mockReturnValue({
    isConnected: true,
    address: "0x1111111111111111111111111111111111111111",
    chainId: 677,
    status: "connected",
    ...overrides,
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
    mutateAsync: connectAsync,
    connectors: [{ id: "metaMask", name: "MetaMask" }],
    isPending: false,
  } as never);
  vi.mocked(useDisconnect).mockReturnValue({
    mutateAsync: disconnectAsync,
  } as never);
  vi.mocked(useSwitchChain).mockReturnValue({
    mutateAsync: switchChainAsync,
    isPending: false,
  } as never);
});

describe("WalletButton", () => {
  it("shows Connect and connects with the MetaMask connector", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(connectAsync).toHaveBeenCalledWith({
      connector: { id: "metaMask", name: "MetaMask" },
    });
  });

  it("shows the connecting state", () => {
    vi.mocked(useConnect).mockReturnValue({
      mutateAsync: connectAsync,
      connectors: [{ id: "metaMask", name: "MetaMask" }],
      isPending: true,
    } as never);
    renderWithProviders(<WalletButton />);
    expect(
      screen.getByRole("button", { name: "Connecting…" }),
    ).toBeDisabled();
  });

  it("explains a rejected connection", async () => {
    const user = userEvent.setup();
    connectAsync.mockRejectedValueOnce(new Error("User rejected the request."));
    renderWithProviders(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Request rejected");
  });

  it("offers the install link when no wallet is detected", async () => {
    const user = userEvent.setup();
    connectAsync.mockRejectedValueOnce(
      new Error("ProviderNotFoundError: unable to find a provider"),
    );
    renderWithProviders(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("MetaMask not detected");
    expect(screen.getByRole("link", { name: "install" })).toHaveAttribute(
      "href",
      "https://metamask.io/download/",
    );
  });

  it("shows the shortened address and disconnects", async () => {
    const user = userEvent.setup();
    mockConnected();
    renderWithProviders(<WalletButton />);

    expect(screen.getByText("0x1111…1111")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Disconnect wallet" }),
    );
    expect(disconnectAsync).toHaveBeenCalled();
  });

  it("offers a chain switch when on the wrong network", async () => {
    const user = userEvent.setup();
    mockConnected({ chainId: 1 });
    renderWithProviders(<WalletButton />);

    await user.click(
      screen.getByRole("button", { name: "Switch to BOT Chain" }),
    );
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 677 });
  });
});
