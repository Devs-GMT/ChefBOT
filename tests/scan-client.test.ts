import { afterEach, describe, expect, it, vi } from "vitest";

import { arrayBufferToBase64, fitWithin, scanFridge } from "@/lib/scan";

const PAYLOAD = { image: "/9j/" + "A".repeat(196), mime: "image/jpeg" as const };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fitWithin", () => {
  it("scales the long side down to the limit, keeping the ratio", () => {
    expect(fitWithin(4032, 3024, 768)).toEqual({ width: 768, height: 576 });
    expect(fitWithin(3024, 4032, 768)).toEqual({ width: 576, height: 768 });
  });

  it("never upscales", () => {
    expect(fitWithin(640, 480, 768)).toEqual({ width: 640, height: 480 });
  });
});

describe("arrayBufferToBase64", () => {
  it("encodes bytes like btoa", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x41]);
    expect(arrayBufferToBase64(bytes.buffer)).toBe("/9j/AEE=");
  });

  it("handles buffers larger than one chunk", () => {
    const bytes = new Uint8Array(100_000).fill(65);
    expect(arrayBufferToBase64(bytes.buffer)).toBe(btoa("A".repeat(100_000)));
  });
});

describe("scanFridge", () => {
  it("reports not_configured without a Worker URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "");
    const fetchMock = vi.fn();
    expect(await scanFridge(PAYLOAD, fetchMock)).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the photo to /scan and keeps only vocabulary ids", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test/");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ingredients: ["egg", "caviar", "tomato"] }), { status: 200 }),
    );
    expect(await scanFridge(PAYLOAD, fetchMock)).toEqual({ ok: true, ingredients: ["egg", "tomato"] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://worker.test/scan");
    expect(JSON.parse(init.body)).toEqual(PAYLOAD);
  });

  it.each([
    [429, "rate_limited"],
    [413, "too_large"],
    [504, "timeout"],
    [502, "failed"],
    [503, "failed"],
  ])("maps HTTP %i to %s", async (status, reason) => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status }));
    expect(await scanFridge(PAYLOAD, fetchMock)).toEqual({ ok: false, reason });
  });

  it("maps network errors, aborts and bad JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECIPES_API_URL", "https://worker.test");
    expect(await scanFridge(PAYLOAD, vi.fn().mockRejectedValue(new TypeError("offline")))).toEqual({
      ok: false,
      reason: "network",
    });
    expect(
      await scanFridge(PAYLOAD, vi.fn().mockRejectedValue(new DOMException("t", "AbortError"))),
    ).toEqual({ ok: false, reason: "timeout" });
    expect(
      await scanFridge(PAYLOAD, vi.fn().mockResolvedValue(new Response("nope", { status: 200 }))),
    ).toEqual({ ok: false, reason: "failed" });
  });
});
