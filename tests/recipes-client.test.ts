import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRecipes, RECIPES_TIMEOUT_MS } from "@/lib/recipes";
import type { RecipeRequest } from "@/shared/recipe-schema";

const REQUEST: RecipeRequest = {
  ingredients: ["egg", "rice", "garlic"],
  maxMinutes: 20,
  vegetarian: false,
};

const VALID_AI_PAYLOAD = {
  recipes: [
    {
      title: "Garlic Egg Fried Rice",
      emoji: "🍳",
      minutes: 15,
      uses: ["egg", "rice", "garlic"],
      missing: ["spring onion"],
      steps: ["Cook rice.", "Fry garlic and egg.", "Toss with soy sauce."],
    },
    {
      title: "Tomato Omelette",
      emoji: "🍳",
      minutes: 10,
      uses: ["egg"],
      missing: ["butter"],
      steps: ["Beat eggs.", "Cook with tomato."],
    },
    {
      title: "Rice Bowl",
      emoji: "🍚",
      minutes: 12,
      uses: ["rice"],
      missing: ["soy sauce"],
      steps: ["Steam rice.", "Top and serve."],
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_RECIPES_API_URL = "https://worker.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.NEXT_PUBLIC_RECIPES_API_URL;
});

describe("getRecipes — AI success", () => {
  it("returns validated AI recipes with source 'ai'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALID_AI_PAYLOAD));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRecipes(REQUEST);
    expect(result.source).toBe("ai");
    expect(result.recipes).toHaveLength(3);
    expect(result.recipes[0].title).toBe("Garlic Egg Fried Rice");
    expect(result.fallbackReason).toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://worker.test/recipes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(REQUEST);
  });
});

describe("getRecipes — fallback states", () => {
  it("falls back when the Worker URL is not configured", async () => {
    delete process.env.NEXT_PUBLIC_RECIPES_API_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRecipes(REQUEST);
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("not_configured");
    expect(result.recipes).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: "ai_error" } }, 502)),
    );
    const result = await getRecipes(REQUEST);
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("http_error");
    expect(result.recipes).toHaveLength(3);
  });

  it("falls back on malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>oops</html>", { status: 200 }),
      ),
    );
    const result = await getRecipes(REQUEST);
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("invalid_response");
  });

  it("falls back on a schema-violating payload", async () => {
    const broken = {
      recipes: VALID_AI_PAYLOAD.recipes.slice(0, 1),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(broken)));
    const result = await getRecipes(REQUEST);
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("invalid_response");
  });

  it("falls back when the network rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    );
    const result = await getRecipes(REQUEST);
    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("network");
  });

  it("falls back after the 8-second timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      ),
    );

    const pending = getRecipes(REQUEST);
    await vi.advanceTimersByTimeAsync(RECIPES_TIMEOUT_MS);
    const result = await pending;

    expect(result.source).toBe("fallback");
    expect(result.fallbackReason).toBe("timeout");
    expect(result.recipes).toHaveLength(3);
  });
});
