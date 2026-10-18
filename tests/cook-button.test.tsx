import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { encodeAbiParameters, encodeEventTopics } from "viem";

import { CookButton } from "@/components/kitchen/cook-button";
import { chefbotAbi } from "@/lib/abi/ChefBOT";
import { contractAddress, fetchIsCooked } from "@/lib/contract";
import { archiveDish } from "@/lib/dish-archive";
import { recipeKey } from "@/lib/recipe-key";
import type { Recipe } from "@/shared/recipe-schema";
import { renderWithProviders } from "./render-with-providers";

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useConnection: vi.fn(),
    useConnect: vi.fn(),
    useSwitchChain: vi.fn(),
    useWriteContract: vi.fn(),
    useWaitForTransactionReceipt: vi.fn(),
  };
});

vi.mock("@/lib/dish-archive", () => ({ archiveDish: vi.fn().mockResolvedValue(true) }));

vi.mock("@/lib/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/contract")>();
  return {
    ...actual,
    contractAddress: vi.fn(),
    fetchIsCooked: vi.fn(),
  };
});

const { useConnection, useConnect, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } =
  await import("wagmi");

const RECIPE: Recipe = {
  title: "Garlic Egg Fried Rice",
  emoji: "🍳",
  minutes: 15,
  uses: ["rice", "egg"],
  missing: ["garlic"],
  steps: ["Cook the rice.", "Fry it.", "Serve."],
};

const ADDRESS = "0x2222222222222222222222222222222222222222" as const;

/** Cooked(key, cook, title, cooks) log as emitted by the contract at ADDRESS. */
function cookedLog(cooks: number) {
  return {
    address: ADDRESS,
    topics: encodeEventTopics({
      abi: chefbotAbi,
      eventName: "Cooked",
      args: { key: recipeKey(RECIPE.title), cook: ADDRESS },
    }),
    data: encodeAbiParameters(
      [{ type: "string" }, { type: "uint32" }],
      [RECIPE.title, cooks],
    ),
  };
}
const connectAsync = vi.fn().mockResolvedValue(undefined);
const switchChainAsync = vi.fn().mockResolvedValue(undefined);
const writeContractAsync = vi.fn();

function mockConnection(
  overrides: Partial<{
    isConnected: boolean;
    address: string | undefined;
    chainId: number | undefined;
  }> = {},
) {
  const connected = overrides.isConnected ?? false;
  vi.mocked(useConnection).mockReturnValue({
    isConnected: connected,
    address: connected ? (overrides.address ?? ADDRESS) : undefined,
    chainId: connected ? (overrides.chainId ?? 677) : undefined,
    status: connected ? "connected" : "disconnected",
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  writeContractAsync.mockResolvedValue("0xdeadbeefhash");
  vi.mocked(contractAddress).mockReturnValue(ADDRESS);
  vi.mocked(fetchIsCooked).mockResolvedValue(false);
  vi.mocked(useConnect).mockReturnValue({
    mutateAsync: connectAsync,
    connectors: [{ id: "metaMask", name: "MetaMask" }],
    isPending: false,
  } as never);
  vi.mocked(useSwitchChain).mockReturnValue({
    mutateAsync: switchChainAsync,
    isPending: false,
  } as never);
  vi.mocked(useWriteContract).mockReturnValue({
    mutateAsync: writeContractAsync,
    isPending: false,
  } as never);
  vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
    data: undefined,
    isError: false,
    isPending: false,
  } as never);
  mockConnection();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CookButton", () => {
  it("shows the deployment notice without a contract address", () => {
    vi.mocked(contractAddress).mockReturnValue(null);
    renderWithProviders(<CookButton recipe={RECIPE} />);
    expect(
      screen.getByText(/Cooking stamps go live once the ChefBOT contract/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "I cooked it 🍳" }),
    ).not.toBeInTheDocument();
  });

  it("prompts wallet connection when disconnected", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookButton recipe={RECIPE} />);

    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    expect(connectAsync).toHaveBeenCalledTimes(1);
    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("switches the chain before cooking on the wrong network", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true, chainId: 1 });
    renderWithProviders(<CookButton recipe={RECIPE} />);

    expect(
      screen.getByRole("button", { name: "Switch network to cook" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Switch network to cook" }),
    );
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 677 });
    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("writes cookIt with the raw title and emoji", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true });
    renderWithProviders(<CookButton recipe={RECIPE} />);

    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    expect(writeContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "cookIt",
        args: ["Garlic Egg Fried Rice", "🍳"],
        chainId: 677,
      }),
    );
  });

  it("shows the confirmed receipt with the on-chain cook number", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true });
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      data: { status: "success", logs: [cookedLog(14)] },
      isError: false,
      isPending: false,
    } as never);
    renderWithProviders(<CookButton recipe={RECIPE} />);

    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Stamped! You're cook #14 of this dish",
    );
    expect(
      screen.getByRole("link", { name: "View transaction on BOT Scan" }),
    ).toHaveAttribute("href", "https://scan.botchain.ai/tx/0xdeadbeefhash");
    const share = screen.getByRole("link", { name: /Share on X/ });
    expect(share.getAttribute("href")).toContain("https://x.com/intent/post");
    expect(share.getAttribute("href")).toContain("cook+%2314");
  });

  it("archives the recipe once the stamp is confirmed", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true });
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      data: { status: "success", logs: [cookedLog(3)] },
      isError: false,
      isPending: false,
    } as never);
    const { rerender } = renderWithProviders(<CookButton recipe={RECIPE} />);
    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    await screen.findByRole("status");
    rerender(<CookButton recipe={RECIPE} />);
    expect(archiveDish).toHaveBeenCalledTimes(1);
    expect(archiveDish).toHaveBeenCalledWith("0xdeadbeefhash", RECIPE);
  });

  it("never archives a cook's own (private) recipe", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true });
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      data: { status: "success", logs: [cookedLog(1)] },
      isError: false,
      isPending: false,
    } as never);
    renderWithProviders(<CookButton recipe={RECIPE} archive={false} />);
    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    await screen.findByRole("status");
    expect(archiveDish).not.toHaveBeenCalled();
  });

  it("still confirms the stamp when the receipt has no Cooked event", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true });
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      data: { status: "success", logs: [] },
      isError: false,
      isPending: false,
    } as never);
    renderWithProviders(<CookButton recipe={RECIPE} />);

    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Stamped!");
    expect(screen.queryByText(/cook #/)).not.toBeInTheDocument();
  });

  it("shows Cooked ✓ when the wallet already stamped the recipe", async () => {
    vi.mocked(fetchIsCooked).mockResolvedValue(true);
    mockConnection({ isConnected: true });
    renderWithProviders(<CookButton recipe={RECIPE} />);

    expect(
      await screen.findByRole("button", { name: "Cooked ✓" }),
    ).toBeDisabled();
    expect(screen.getByText(/already recorded/)).toBeInTheDocument();
  });

  it("lets the cook back out when MetaMask never answers the stamp", async () => {
    mockConnection({ isConnected: true });
    writeContractAsync.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CookButton recipe={RECIPE} />);

    vi.useFakeTimers();
    act(() => {
      screen.getByRole("button", { name: "I cooked it 🍳" }).click();
    });
    expect(screen.getByRole("button", { name: /Confirm in wallet/ })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(12_000);
    });
    expect(screen.getByText(/Waiting for MetaMask/)).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "Cancel" }).click();
    });
    expect(screen.getByRole("button", { name: "I cooked it 🍳" })).toBeEnabled();
  });

  it("explains a rejected transaction", async () => {
    const user = userEvent.setup();
    mockConnection({ isConnected: true });
    writeContractAsync.mockRejectedValueOnce(
      new Error("User rejected the request."),
    );
    renderWithProviders(<CookButton recipe={RECIPE} />);

    await user.click(screen.getByRole("button", { name: "I cooked it 🍳" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Request rejected",
    );
  });
});
