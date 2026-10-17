import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  INTRO_SEEN_KEY,
  isLiteDevice,
  MOTION_FALLBACK_MS,
  PREPAINT_SCRIPT,
  shouldPlayIntro,
} from "@/components/landing/intro/intro-script";

describe("shouldPlayIntro", () => {
  it("plays on a first visit when motion is allowed", () => {
    expect(shouldPlayIntro({ seen: false, reduced: false, lite: false })).toBe(true);
  });

  it("skips once the intro was seen this session", () => {
    expect(shouldPlayIntro({ seen: true, reduced: false, lite: false })).toBe(false);
  });

  it("skips for visitors who prefer reduced motion", () => {
    expect(shouldPlayIntro({ seen: false, reduced: true, lite: false })).toBe(false);
  });

  it("skips on lite devices (Save-Data or ≤2 GB memory)", () => {
    expect(shouldPlayIntro({ seen: false, reduced: false, lite: true })).toBe(false);
  });
});

describe("isLiteDevice", () => {
  it("flags Save-Data connections", () => {
    expect(isLiteDevice({ connection: { saveData: true } })).toBe(true);
  });

  it("flags devices with 2 GB of memory or less", () => {
    expect(isLiteDevice({ deviceMemory: 2 })).toBe(true);
    expect(isLiteDevice({ deviceMemory: 4 })).toBe(false);
  });

  it("treats unknown capabilities as a normal device", () => {
    expect(isLiteDevice({})).toBe(false);
  });
});

describe("PREPAINT_SCRIPT", () => {
  const root = document.documentElement;

  function run(reduced: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("reduce") ? reduced : false,
      })),
    );
    new Function(PREPAINT_SCRIPT)();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    root.className = "";
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    root.className = "";
  });

  it("enables motion and the intro on a first visit", () => {
    run(false);
    expect(root.classList.contains("motion")).toBe(true);
    expect(root.classList.contains("intro-active")).toBe(true);
  });

  it("enables motion without the intro when it was already seen", () => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    run(false);
    expect(root.classList.contains("motion")).toBe(true);
    expect(root.classList.contains("intro-active")).toBe(false);
  });

  it("leaves the page static under reduced motion", () => {
    run(true);
    expect(root.classList.contains("motion")).toBe(false);
    expect(root.classList.contains("intro-active")).toBe(false);
  });

  it("keeps motion but skips the intro under Save-Data", () => {
    vi.stubGlobal("navigator", { ...navigator, connection: { saveData: true } });
    run(false);
    expect(root.classList.contains("motion")).toBe(true);
    expect(root.classList.contains("intro-active")).toBe(false);
  });

  it("un-hides everything if the motion code never starts", () => {
    run(false);
    vi.advanceTimersByTime(MOTION_FALLBACK_MS);
    expect(root.classList.contains("motion")).toBe(false);
    expect(root.classList.contains("intro-active")).toBe(false);
  });

  it("keeps motion once the landing code reports ready", () => {
    run(false);
    root.classList.add("motion-ready");
    vi.advanceTimersByTime(MOTION_FALLBACK_MS);
    expect(root.classList.contains("motion")).toBe(true);
  });
});
