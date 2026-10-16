import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs vitest with jsdom and jest-dom matchers", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    el.remove();
  });
});
