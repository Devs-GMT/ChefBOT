// @vitest-environment node
import { encodeAbiParameters, encodeEventTopics, keccak256, toEventSelector, toHex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chefbotAbi } from "@/lib/abi/ChefBOT";
import type { Recipe } from "@/shared/recipe-schema";
import type { WorkerEnv } from "@/worker/src/env";
import chefbotWorker from "@/worker/src/index";
import { COOKED_TOPIC0, decodeCookedData } from "@/worker/src/lib/chain";
import { resetRateLimiter } from "@/worker/src/lib/rate-limit";

const ORIGIN = "https://chefbot.test";
const CONTRACT = "0x939878F4aA5564B91aFa1e8758A100F14AAbcB85";
const RPC = "https://rpc.test";
const TX = `0x${"ab".repeat(32)}`;
const COOK = "0x1111111111111111111111111111111111111111";

const RECIPE: Recipe = {
  title: "Garlic Egg Fried Rice",
  emoji: "🍳",
  minutes: 15,
  uses: ["egg", "rice"],
  missing: ["spring onion"],
  steps: ["Cook the rice.", "Fry the garlic and egg.", "Toss and serve."],
};

/** Minimal in-memory KV with the Workers API surface we use. */
function memoryKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    GEMINI_API_KEY: "test-key",
    CORS_ALLOWED_ORIGINS: ORIGIN,
    RATE_LIMIT_PER_HOUR: "20",
    CHAIN_RPC_URL: RPC,
    CHEFBOT_CONTRACT_ADDRESS: CONTRACT,
    DISHES: memoryKv(),
    ...overrides,
  };
}

/** A real Cooked log, encoded by viem from the contract ABI. */
function cookedLog(title: string, opts: { address?: string; cooks?: number } = {}) {
  const key = keccak256(toHex(title.trim().toLowerCase()));
  const topics = encodeEventTopics({ abi: chefbotAbi, eventName: "Cooked", args: { key, cook: COOK } });
  const data = encodeAbiParameters([{ type: "string" }, { type: "uint32" }], [title, opts.cooks ?? 3]);
  return { address: (opts.address ?? CONTRACT).toLowerCase(), topics, data };
}

function receiptResponse(receipt: unknown) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: receipt }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function rpcReturning(receipt: unknown) {
  return vi.fn().mockImplementation(async () => receiptResponse(receipt));
}

function post(body: unknown, raw?: string) {
  return new Request("https://worker.test/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, "CF-Connecting-IP": "203.0.113.30" },
    body: raw ?? JSON.stringify(body),
  });
}

function get(title: string) {
  return new Request(`https://worker.test/dishes?title=${encodeURIComponent(title)}`, {
    headers: { Origin: ORIGIN },
  });
}

beforeEach(() => {
  resetRateLimiter();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cooked log decoding", () => {
  it("uses the real event selector", () => {
    const event = chefbotAbi.find((item) => item.type === "event" && item.name === "Cooked")!;
    expect(COOKED_TOPIC0).toBe(toEventSelector(event as never));
  });

  it("decodes title and cook count like viem encodes them", () => {
    const { data } = cookedLog("Bánh Mì Ốp La 🍞", { cooks: 42 });
    expect(decodeCookedData(data)).toEqual({ title: "Bánh Mì Ốp La 🍞", cooks: 42 });
  });

  it("rejects malformed data", () => {
    expect(decodeCookedData("0x1234")).toBeNull();
    expect(decodeCookedData("not hex")).toBeNull();
  });
});

describe("POST /dishes (archive a stamped recipe)", () => {
  it("stores the recipe after the receipt proves the stamp", async () => {
    const fetchMock = rpcReturning({ status: "0x1", to: CONTRACT.toLowerCase(), logs: [cookedLog("garlic egg fried rice")] });
    vi.stubGlobal("fetch", fetchMock);
    const env = makeEnv();

    const response = await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), env);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ stored: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(RPC);
    expect(JSON.parse(init.body)).toMatchObject({ method: "eth_getTransactionReceipt", params: [TX] });
    const kv = env.DISHES as ReturnType<typeof memoryKv>;
    expect(JSON.parse(kv.store.get("dish:garlic egg fried rice")!).recipe).toEqual(RECIPE);
  });

  it("first writer wins — an existing dish is never overwritten", async () => {
    vi.stubGlobal("fetch", rpcReturning({ status: "0x1", logs: [cookedLog(RECIPE.title)] }));
    const env = makeEnv();
    await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), env);
    const second = await chefbotWorker.fetch(
      post({ txHash: TX, recipe: { ...RECIPE, steps: ["Something else entirely."] } }),
      env,
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ stored: false });
    const kv = env.DISHES as ReturnType<typeof memoryKv>;
    expect(JSON.parse(kv.store.get("dish:garlic egg fried rice")!).recipe.steps).toEqual(RECIPE.steps);
  });

  it.each([
    ["reverted tx", { status: "0x0", logs: [cookedLog(RECIPE.title)] }, "stamp_not_proven"],
    ["log from another contract", { status: "0x1", logs: [cookedLog(RECIPE.title, { address: COOK })] }, "stamp_not_proven"],
    ["different dish", { status: "0x1", logs: [cookedLog("Tomato Omelette")] }, "stamp_not_proven"],
    ["no logs", { status: "0x1", logs: [] }, "stamp_not_proven"],
    ["unknown tx", null, "stamp_not_proven"],
  ])("refuses when the receipt does not prove the stamp (%s)", async (_label, receipt, code) => {
    vi.stubGlobal("fetch", rpcReturning(receipt));
    const env = makeEnv();
    const response = await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), env);
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe(code);
    expect((env.DISHES as ReturnType<typeof memoryKv>).put).not.toHaveBeenCalled();
  });

  it("maps RPC failures to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    const response = await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), makeEnv());
    expect(response.status).toBe(502);
  });

  it.each([
    ["bad tx hash", { txHash: "0x12", recipe: RECIPE }],
    ["invalid recipe", { txHash: TX, recipe: { ...RECIPE, steps: [] } }],
    ["not an object", "nope"],
  ])("rejects %s with 400 before calling the chain", async (_label, body) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await chefbotWorker.fetch(post(body), makeEnv());
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies and reports a missing archive binding", async () => {
    const big = await chefbotWorker.fetch(post(null, JSON.stringify({ txHash: TX, pad: "x".repeat(9000) })), makeEnv());
    expect(big.status).toBe(413);
    const unbound = await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), makeEnv({ DISHES: undefined }));
    expect(unbound.status).toBe(503);
  });

  it("is rate-limited", async () => {
    vi.stubGlobal("fetch", rpcReturning({ status: "0x1", logs: [cookedLog(RECIPE.title)] }));
    const env = makeEnv({ RATE_LIMIT_PER_HOUR: "1" });
    expect((await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), env)).status).toBe(201);
    expect((await chefbotWorker.fetch(post({ txHash: TX, recipe: RECIPE }), env)).status).toBe(429);
  });
});

describe("GET /dishes?title=", () => {
  it("returns an archived recipe by any casing of its title, cacheable", async () => {
    const env = makeEnv();
    (env.DISHES as ReturnType<typeof memoryKv>).store.set(
      "dish:garlic egg fried rice",
      JSON.stringify({ recipe: RECIPE, txHash: TX }),
    );
    const response = await chefbotWorker.fetch(get("  GARLIC Egg Fried Rice "), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
    const body = await response.json();
    expect(body).toEqual({ recipe: RECIPE });
    expect(JSON.stringify(body)).not.toContain(TX);
  });

  it("404s unknown dishes and 400s a missing or oversized title", async () => {
    expect((await chefbotWorker.fetch(get("Nope"), makeEnv())).status).toBe(404);
    expect(
      (await chefbotWorker.fetch(new Request("https://worker.test/dishes", { headers: { Origin: ORIGIN } }), makeEnv()))
        .status,
    ).toBe(400);
    expect((await chefbotWorker.fetch(get("x".repeat(200)), makeEnv())).status).toBe(400);
  });

  it("is not rate-limited (the leaderboard reads many)", async () => {
    const env = makeEnv({ RATE_LIMIT_PER_HOUR: "1" });
    for (let i = 0; i < 3; i++) {
      expect((await chefbotWorker.fetch(get("Nope"), env)).status).toBe(404);
    }
  });
});
