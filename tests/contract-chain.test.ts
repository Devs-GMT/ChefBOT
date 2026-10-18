import { encodeFunctionResult, toFunctionSelector } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { chefbotAbi } from "@/lib/abi/ChefBOT";
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
  params?: Array<{ data?: string; input?: string }>;
}

const GET_DISHES_SELECTOR = toFunctionSelector("getDishes()");
const COOKED_SELECTOR = toFunctionSelector("cooked(bytes32,address)");

let dishesResult: `0x${string}` = encodeFunctionResult({
  abi: chefbotAbi,
  functionName: "getDishes",
  result: [[], []],
});

function resultFor(request: RpcRequest): string {
  if (request.method === "eth_chainId") {
    return "0x3c8";
  }
  const data = request.params?.[0]?.data ?? request.params?.[0]?.input ?? "";
  if (data.startsWith(GET_DISHES_SELECTOR)) {
    return dishesResult;
  }
  if (data.startsWith(COOKED_SELECTOR)) {
    return FALSE_HEX;
  }
  return EMPTY_ARRAY_HEX;
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
        result: resultFor(request),
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
  dishesResult = encodeFunctionResult({ abi: chefbotAbi, functionName: "getDishes", result: [[], []] });
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

describe("fetchDishes reads keys and dishes atomically (PRD §5 getDishes)", () => {
  it("maps keys[i] to list[i] from a single eth_call", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CHAIN_ID", "968");
    vi.stubEnv("NEXT_PUBLIC_CHEFBOT_CONTRACT_ADDRESS", CONTRACT);
    const keyA = `0x${"aa".repeat(32)}` as const;
    const keyB = `0x${"bb".repeat(32)}` as const;
    dishesResult = encodeFunctionResult({
      abi: chefbotAbi,
      functionName: "getDishes",
      result: [
        [keyA, keyB],
        [
          { title: "Fried Rice", emoji: "🍚", cooks: 3 },
          { title: "Ramen", emoji: "🍜", cooks: 5 },
        ],
      ],
    });
    stubRpc();

    await expect(fetchDishes()).resolves.toEqual([
      { key: keyA, title: "Fried Rice", emoji: "🍚", cooks: 3 },
      { key: keyB, title: "Ramen", emoji: "🍜", cooks: 5 },
    ]);

    const calls = vi
      .mocked(globalThis.fetch)
      .mock.calls.flatMap(([, init]) => {
        const body = JSON.parse(String(init?.body ?? "{}")) as RpcRequest | RpcRequest[];
        return Array.isArray(body) ? body : [body];
      })
      .filter((request) => request.method === "eth_call");
    expect(calls).toHaveLength(1);
  });
});
