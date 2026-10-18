import { afterEach, describe, expect, it, vi } from "vitest";

import { archiveDish, fetchArchivedDish } from "@/lib/dish-archive";
import type { Recipe } from "@/shared/recipe-schema";

const TX = `0x${"ab".repeat(32)}` as const;
const RECIPE: Recipe = {
  title: "Garlic Egg Fried Rice",
  emoji: "🍳",
  minutes: 15,
  uses: ["egg", "rice"],
  missing: [],
  steps: ["Cook the rice.", "Fry and toss."],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("archiveDish", () => {
  it("does nothing without a Worker URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "");
    const fetchMock = vi.fn();
    expect(await archiveDish(TX, RECIPE, fetchMock)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the tx hash and recipe to /dishes", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test/");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"stored":true}', { status: 201 }));
    expect(await archiveDish(TX, RECIPE, fetchMock)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://worker.test/dishes");
    expect(JSON.parse(init.body)).toEqual({ txHash: TX, recipe: RECIPE });
  });

  it("never throws (best effort after a stamp)", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test");
    expect(await archiveDish(TX, RECIPE, vi.fn().mockRejectedValue(new TypeError("offline")))).toBe(false);
    expect(await archiveDish(TX, RECIPE, vi.fn().mockResolvedValue(new Response("{}", { status: 422 })))).toBe(false);
  });
});

describe("fetchArchivedDish", () => {
  it("returns null without a Worker URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "");
    expect(await fetchArchivedDish("Anything", vi.fn())).toBeNull();
  });

  it("reads a dish by title and validates it", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ recipe: RECIPE }), { status: 200 }));
    expect(await fetchArchivedDish("Garlic Egg Fried Rice", fetchMock)).toEqual(RECIPE);
    expect(fetchMock.mock.calls[0][0]).toBe("https://worker.test/dishes?title=Garlic%20Egg%20Fried%20Rice");
  });

  it("returns null for 404, network errors and malformed payloads", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test");
    expect(await fetchArchivedDish("x", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })))).toBeNull();
    expect(await fetchArchivedDish("x", vi.fn().mockRejectedValue(new TypeError("down")))).toBeNull();
    expect(
      await fetchArchivedDish(
        "x",
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ recipe: { title: "x" } }), { status: 200 })),
      ),
    ).toBeNull();
  });
});
