import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineScript } from "@/components/ui/inline-script";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InlineScript", () => {
  it("is plain text on the client, so React neither runs nor warns about it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<InlineScript html="window.__ran = true" />);
    const script = container.querySelector("script");
    expect(script?.getAttribute("type")).toBe("text/plain");
    expect(script?.innerHTML).toBe("window.__ran = true");
    expect(error.mock.calls.flat().join(" ")).not.toMatch(/Encountered a script tag/);
  });

  it("is real JavaScript in server-rendered HTML", () => {
    const original = globalThis.window;
    // Simulate the server: no window while rendering to a string.
    // @ts-expect-error -- deleting for the server render only
    delete globalThis.window;
    try {
      const html = renderToString(<InlineScript html="1+1" />);
      expect(html).toContain('type="text/javascript"');
      expect(html).toContain("1+1");
    } finally {
      globalThis.window = original;
    }
  });
});
