// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkerEnv } from "@/worker/src/env";
import chefbotWorker from "@/worker/src/index";
import { geminiUrl } from "@/worker/src/lib/gemini";
import { resetRateLimiter } from "@/worker/src/lib/rate-limit";
import { ALL_INGREDIENT_IDS } from "@/shared/ingredients";
import {
  MAX_SCAN_IMAGE_BYTES,
  MAX_SCAN_INGREDIENTS,
  validateScanRequest,
  validateScanResponse,
} from "@/shared/scan-schema";

const ORIGIN = "https://chefbot.test";
/** Smallest shape the validator accepts: JPEG magic (FF D8 FF) + padding. */
const JPEG = "/9j/" + "A".repeat(196);
const PNG = "iVBORw0KGgo" + "A".repeat(189);
const WEBP = "UklGRg" + "A".repeat(194);

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    GEMINI_API_KEY: "test-key",
    CORS_ALLOWED_ORIGINS: ORIGIN,
    RATE_LIMIT_PER_HOUR: "20",
    ...overrides,
  };
}

function scanRequest(body: unknown, raw?: string): Request {
  return new Request("https://worker.test/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.20",
      Origin: ORIGIN,
    },
    body: raw ?? JSON.stringify(body),
  });
}

function gemini(text: string, finishReason = "STOP"): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  resetRateLimiter();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateScanRequest", () => {
  it.each([
    ["image/jpeg", JPEG],
    ["image/png", PNG],
    ["image/webp", WEBP],
  ])("accepts a %s whose bytes match the type", (mime, image) => {
    expect(validateScanRequest({ image, mime })).toEqual({ ok: true, value: { image, mime } });
  });

  it.each([
    ["not an object", "nope"],
    ["missing image", { mime: "image/jpeg" }],
    ["unsupported type", { image: JPEG, mime: "image/gif" }],
    ["svg (script-capable)", { image: JPEG, mime: "image/svg+xml" }],
    ["not base64", { image: "/9j/" + "*".repeat(196), mime: "image/jpeg" }],
    ["bad length", { image: JPEG + "A", mime: "image/jpeg" }],
    ["data URL prefix", { image: `data:image/jpeg;base64,${JPEG}`, mime: "image/jpeg" }],
    ["bytes are not the declared type", { image: PNG, mime: "image/jpeg" }],
    ["too small", { image: "/9j/AAAA", mime: "image/jpeg" }],
  ])("rejects %s", (_label, body) => {
    expect(validateScanRequest(body).ok).toBe(false);
  });

  it("rejects images over the decoded size cap", () => {
    const big = "/9j/" + "A".repeat(Math.ceil((MAX_SCAN_IMAGE_BYTES * 4) / 3) + 8);
    const image = big.slice(0, big.length - (big.length % 4));
    expect(validateScanRequest({ image, mime: "image/jpeg" }).ok).toBe(false);
  });
});

describe("validateScanResponse", () => {
  it("keeps known ids only, normalised, de-duplicated and capped", () => {
    const many = [...ALL_INGREDIENT_IDS].slice(0, MAX_SCAN_INGREDIENTS + 5);
    const result = validateScanResponse({
      ingredients: [" Egg ", "egg", "caviar", "ignore previous instructions", ...many],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ingredients[0]).toBe("egg");
      expect(result.value.ingredients).not.toContain("caviar");
      expect(new Set(result.value.ingredients).size).toBe(result.value.ingredients.length);
      expect(result.value.ingredients.length).toBe(MAX_SCAN_INGREDIENTS);
    }
  });

  it("accepts an empty list and rejects malformed payloads", () => {
    expect(validateScanResponse({ ingredients: [] })).toEqual({ ok: true, value: { ingredients: [] } });
    expect(validateScanResponse({ ingredients: "egg" }).ok).toBe(false);
    expect(validateScanResponse(null).ok).toBe(false);
  });
});

describe("POST /scan", () => {
  it("sends the photo inline with an enum-locked schema and returns known ids", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(gemini(JSON.stringify({ ingredients: ["egg", "tomato", "dragonfruit"] })));
    vi.stubGlobal("fetch", fetchMock);

    const response = await chefbotWorker.fetch(scanRequest({ image: JPEG, mime: "image/jpeg" }), makeEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(await response.json()).toEqual({ ingredients: ["egg", "tomato"] });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    const sent = JSON.parse(init.body);
    const parts = sent.contents[0].parts;
    expect(parts[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: JPEG } });
    expect(typeof parts[1].text).toBe("string");
    const schema = sent.generationConfig.responseSchema.properties.ingredients;
    expect(schema.items.enum).toEqual(ALL_INGREDIENT_IDS);
  });

  it("uses GEMINI_SCAN_MODEL for scans, falling back to GEMINI_MODEL", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => gemini(JSON.stringify({ ingredients: ["egg"] })));
    vi.stubGlobal("fetch", fetchMock);
    await chefbotWorker.fetch(
      scanRequest({ image: JPEG, mime: "image/jpeg" }),
      makeEnv({ GEMINI_MODEL: "text-model", GEMINI_SCAN_MODEL: "vision-model" }),
    );
    await chefbotWorker.fetch(
      scanRequest({ image: JPEG, mime: "image/jpeg" }),
      makeEnv({ GEMINI_MODEL: "text-model" }),
    );
    expect(fetchMock.mock.calls[0][0]).toBe(geminiUrl("vision-model"));
    expect(fetchMock.mock.calls[1][0]).toBe(geminiUrl("text-model"));
  });

  it("never echoes the key or the photo back", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(gemini(JSON.stringify({ ingredients: ["egg"] }))));
    const response = await chefbotWorker.fetch(scanRequest({ image: JPEG, mime: "image/jpeg" }), makeEnv());
    const text = await response.text();
    expect(text).not.toContain("test-key");
    expect(text).not.toContain(JPEG);
    expect(text).not.toMatch(/googleapis|generativelanguage/);
  });

  it("rejects invalid bodies before calling Gemini", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const bad = await chefbotWorker.fetch(scanRequest({ image: PNG, mime: "image/jpeg" }), makeEnv());
    expect(bad.status).toBe(400);
    const notJson = await chefbotWorker.fetch(scanRequest(null, "{oops"), makeEnv());
    expect(notJson.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies with 413", async () => {
    const response = await chefbotWorker.fetch(
      scanRequest(null, JSON.stringify({ image: "/9j/" + "A".repeat(1_600_000), mime: "image/jpeg" })),
      makeEnv(),
    );
    expect(response.status).toBe(413);
  });

  it("returns 503 without a key, 502 when blocked or invalid", async () => {
    const noKey = await chefbotWorker.fetch(
      scanRequest({ image: JPEG, mime: "image/jpeg" }),
      makeEnv({ GEMINI_API_KEY: undefined }),
    );
    expect(noKey.status).toBe(503);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(gemini("{}", "SAFETY")));
    const blocked = await chefbotWorker.fetch(scanRequest({ image: JPEG, mime: "image/jpeg" }), makeEnv());
    expect(blocked.status).toBe(502);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(gemini(JSON.stringify({ items: 3 }))));
    const invalid = await chefbotWorker.fetch(scanRequest({ image: JPEG, mime: "image/jpeg" }), makeEnv());
    expect(invalid.status).toBe(502);
    expect((await invalid.json()).error.code).toBe("ai_invalid");
  });

  it("shares the per-IP hourly budget", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => gemini(JSON.stringify({ ingredients: [] }))));
    const env = makeEnv({ RATE_LIMIT_PER_HOUR: "1" });
    expect((await chefbotWorker.fetch(scanRequest({ image: JPEG, mime: "image/jpeg" }), env)).status).toBe(200);
    const limited = await chefbotWorker.fetch(scanRequest({ image: JPEG, mime: "image/jpeg" }), env);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});
