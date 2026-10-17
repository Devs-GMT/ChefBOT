import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connect, disconnect, getConnection, switchChain } from "wagmi/actions";

import { classifyWalletError } from "@/lib/wallet-errors";
import { wagmiConfig } from "@/lib/wagmi";

/**
 * End-to-end MetaMask connect against a simulated EIP-1193 provider.
 * Mirrors what the extension answers: permission prompts, chain lookups,
 * switches and the 4902 "chain not added" path that must trigger
 * wallet_addEthereumChain for BOT Chain.
 */
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const MAINNET_HEX = "0x2a5"; // 677
const TESTNET_HEX = "0x3c8"; // 968

interface RpcCall {
  method: string;
  params?: unknown;
}

interface FakeMetaMask {
  isMetaMask: boolean;
  _events: Record<string, unknown>;
  _state: { isUnlocked: boolean };
  calls: RpcCall[];
  chainId: string;
  knownChains: Set<string>;
  accounts: string[];
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

function createFakeMetaMask(options: { chainId?: string } = {}): FakeMetaMask {
  const accounts = [ACCOUNT];
  const chainId = options.chainId ?? MAINNET_HEX;
  const knownChains = new Set([chainId]);
  const state = { chainId };
  const calls: RpcCall[] = [];
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  const provider: FakeMetaMask = {
    isMetaMask: true,
    _events: {},
    _state: { isUnlocked: true },
    calls,
    chainId,
    knownChains,
    accounts,
    async request({ method, params }) {
      calls.push({ method, params });
      switch (method) {
        case "eth_chainId":
          return state.chainId;
        case "eth_accounts":
        case "eth_requestAccounts":
          return accounts;
        case "wallet_requestPermissions":
          return [
            { caveats: [{ type: "returnedCapabilities", value: accounts }] },
          ];
        case "wallet_switchEthereumChain": {
          const target = (params as [{ chainId: string }])[0].chainId;
          if (!knownChains.has(target)) {
            const error = new Error(
              `MetaMask: No chain found with chainId "${target}".`,
            ) as Error & { code: number };
            error.code = 4902;
            throw error;
          }
          state.chainId = target;
          provider.chainId = target;
          return null;
        }
        case "wallet_addEthereumChain": {
          // MetaMask adds the network and switches to it immediately.
          const target = (params as [{ chainId: string }])[0].chainId;
          knownChains.add(target);
          state.chainId = target;
          provider.chainId = target;
          return null;
        }
        default:
          return null;
      }
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(handler);
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
    },
    removeListener(event, handler) {
      listeners.get(event)?.delete(handler);
    },
  };
  return provider;
}

function preferredConnector() {
  const connector = wagmiConfig.connectors.find((candidate) =>
    candidate.id.toLowerCase().includes("meta"),
  );
  expect(connector).toBeDefined();
  return connector!;
}

function setEthereum(provider: unknown) {
  (window as unknown as { ethereum?: unknown }).ethereum = provider;
}

function clearEthereum() {
  delete (window as unknown as { ethereum?: unknown }).ethereum;
}

beforeEach(async () => {
  try {
    await disconnect(wagmiConfig);
  } catch {
    // Nothing was connected — nothing to clean up.
  }
});

afterEach(async () => {
  // Disconnect while the provider still exists (the injected connector throws
  // ProviderNotFoundError once window.ethereum is gone), then remove it.
  try {
    await disconnect(wagmiConfig);
  } catch {
    // Keep the next test isolated even if this one failed mid-flow.
  }
  clearEthereum();
});

describe("MetaMask connect (simulated EIP-1193 provider)", () => {
  it("connects the preferred MetaMask connector to window.ethereum", async () => {
    const provider = createFakeMetaMask();
    setEthereum(provider);

    await connect(wagmiConfig, { connector: preferredConnector() });

    const connection = getConnection(wagmiConfig);
    expect(connection.isConnected).toBe(true);
    expect(connection.address?.toLowerCase()).toBe(ACCOUNT.toLowerCase());
    expect(connection.chainId).toBe(677);
    // shimDisconnect prompts via wallet_requestPermissions first and then
    // re-reads eth_accounts for a stable ordering.
    expect(provider.calls.map((call) => call.method)).toEqual(
      expect.arrayContaining(["wallet_requestPermissions", "eth_accounts"]),
    );
  });

  it("adds BOT Chain Testnet when MetaMask reports chain 4902", async () => {
    const provider = createFakeMetaMask();
    setEthereum(provider);
    await connect(wagmiConfig, { connector: preferredConnector() });

    await switchChain(wagmiConfig, { chainId: 968 });

    const addCall = provider.calls.find(
      (call) => call.method === "wallet_addEthereumChain",
    );
    expect(addCall).toBeDefined();
    const [params] = addCall!.params as [
      {
        chainId: string;
        chainName: string;
        rpcUrls: string[];
        blockExplorerUrls: string[];
      },
    ];
    expect(params.chainId).toBe(TESTNET_HEX);
    expect(params.chainName).toBe("BOT Chain Testnet");
    expect(params.rpcUrls).toContain("https://rpc.bohr.life");
    expect(params.blockExplorerUrls).toContain("https://scan.bohr.life");
    expect(getConnection(wagmiConfig).chainId).toBe(968);
  });

  it("reports a clean missing-provider error when MetaMask is not installed", async () => {
    clearEthereum();

    const error = await connect(wagmiConfig, {
      connector: preferredConnector(),
    }).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).toMatch(/provider not found/i);
    expect(classifyWalletError(error)).toBe("no_wallet");
  });
});
