import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchDishes, fetchIsCooked, fetchMyDishKeys } from "@/lib/contract";

/**
 * Reproduction tests for the chain-targeting bug: every on-chain read must be
 * sent to the RPC of the chain selected by NEXT_PUBLIC_CHEFBOT_CHAIN_ID —
 * the deployed contract only exists on that chain.
 */
const CONTRACT = "0x5191b250E9F18d640B2138a1Da0409be0f1dD092";
const COOK = "0x1111111111111111111111111111111111111111";
const DISH_KEY = `0x${"ab".repeat(32)}`;

/** abi.encode of an empty dynamic array: offset (0x20) then length (0). */
const EMPTY_ARRAY_HEX = `0x${"0".repeat(63)}20${"0".repeat(64)}`;
/** abi-encoded `false`. */
const FALSE_HEX = `0x${"0".repeat(64)}`;

interface RpcRequest {
  id: number;
  method: string;
}

function resultFor(method: string): string {
  switch (method) {
    case "eth_chainId":
      return "0x3c8";
    case "cooked":
      return FALSE_HEX;
    default:
      return EMPTY_ARRAY_HEX;
  }
}

/** Stubs global fetch with a JSON-RPC responder and records every RPC URL. */
function stubRpc(): string[] {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(input));
      const payload = JSON.parse(String(init?.body ?? "{}")) as
        | RpcRequest
        | RpcRequest[];
      const respond = (request: RpcRequest) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: resultFor(request.method),
      });
      const body = Array.isArray(payload)
        ? payload.map(respond)
        : respond(payload);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  return urls;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("contract reads follow NEXT_PUBLIC_CHEFBOT_CHAIN_ID", () => {
  it("reads the leaderboard from the testnet RPC when targeting 968", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS", CONTRACT);
    const urls = stubRpc();

    await expect(fetchDishes()).resolves.toEqual([]);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes("rpc.bohr.life"))).toBe(true);
    expect(urls.some((url) => url.includes("rpc.botchain.ai"))).toBe(false);
  });

  it("reads My Kitchen from the testnet RPC when targeting 968", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS", CONTRACT);
    const urls = stubRpc();

    await expect(fetchMyDishKeys(COOK as `0x${string}`)).resolves.toEqual([]);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes("rpc.bohr.life"))).toBe(true);
  });

  it("reads the cooked flag from the testnet RPC when targeting 968", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS", CONTRACT);
    const urls = stubRpc();

    await expect(
      fetchIsCooked(COOK as `0x${string}`, DISH_KEY as `0x${string}`),
    ).resolves.toBe(false);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes("rpc.bohr.life"))).toBe(true);
  });

  it("reads from the mainnet RPC when targeting 677", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "677");
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS", CONTRACT);
    const urls = stubRpc();

    await expect(fetchDishes()).resolves.toEqual([]);

    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes("rpc.botchain.ai"))).toBe(true);
    expect(urls.some((url) => url.includes("rpc.bohr.life"))).toBe(false);
  });
});
