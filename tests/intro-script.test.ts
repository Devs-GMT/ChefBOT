import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  afterIntro,
  introElapsedMs,
  INTRO_DONE_EVENT,
  INTRO_SEEN_KEY,
  isLiteDevice,
  MOTION_FALLBACK_MS,
  PREPAINT_SCRIPT,
  shouldPlayIntro,
  splitIntroWord,
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

  it("only touches the landing page (it runs from the shared <head>)", () => {
    window.history.pushState({}, "", "/app");
    try {
      run(false);
      expect(root.className).toBe("");
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("skips below-the-fold layout for the first frame only", () => {
    run(false);
    expect(root.classList.contains("intro-first")).toBe(true);
    vi.advanceTimersByTime(100);
    expect(root.classList.contains("intro-first")).toBe(false);
    expect(root.classList.contains("intro-active")).toBe(true);
  });

  it("records when the intro started, so a dev remount can resume instead of restarting", () => {
    delete (window as { __chefbotIntroT0?: number }).__chefbotIntroT0;
    run(false);
    expect(typeof (window as { __chefbotIntroT0?: number }).__chefbotIntroT0).toBe("number");
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

describe("splitIntroWord", () => {
  it("splits into words of characters with one running index for the stagger", () => {
    expect(splitIntroWord("Real Food.")).toEqual([
      [
        { ch: "R", i: 0 },
        { ch: "e", i: 1 },
        { ch: "a", i: 2 },
        { ch: "l", i: 3 },
      ],
      [
        { ch: "F", i: 4 },
        { ch: "o", i: 5 },
        { ch: "o", i: 6 },
        { ch: "d", i: 7 },
        { ch: ".", i: 8 },
      ],
    ]);
  });
});

describe("afterIntro", () => {
  afterEach(() => {
    document.documentElement.classList.remove("intro-active");
    vi.useRealTimers();
  });

  it("runs right away when no intro is playing", () => {
    const run = vi.fn();
    afterIntro(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("waits for the intro to finish, once", () => {
    document.documentElement.classList.add("intro-active");
    const run = vi.fn();
    afterIntro(run);
    expect(run).not.toHaveBeenCalled();
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("never waits forever", () => {
    vi.useFakeTimers();
    document.documentElement.classList.add("intro-active");
    const run = vi.fn();
    afterIntro(run, 9000);
    vi.advanceTimersByTime(9000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("can be cancelled", () => {
    document.documentElement.classList.add("intro-active");
    const run = vi.fn();
    const cancel = afterIntro(run);
    cancel();
    window.dispatchEvent(new Event(INTRO_DONE_EVENT));
    expect(run).not.toHaveBeenCalled();
  });
});

describe("introElapsedMs", () => {
  beforeEach(() => {
    delete (window as { __chefbotIntroT0?: number }).__chefbotIntroT0;
  });

  afterEach(() => {
    delete (window as { __chefbotIntroT0?: number }).__chefbotIntroT0;
  });

  it("is 0 when the prepaint script never ran", () => {
    expect(introElapsedMs(5000)).toBe(0);
  });

  it("measures from the recorded start", () => {
    (window as { __chefbotIntroT0?: number }).__chefbotIntroT0 = 1200;
    expect(introElapsedMs(2000)).toBe(800);
    expect(introElapsedMs(1000)).toBe(0);
  });
});
