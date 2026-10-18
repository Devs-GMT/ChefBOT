import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LegacyHashRedirect, routeForHash } from "@/components/kitchen/legacy-hash-redirect";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  replace.mockReset();
  window.history.replaceState(null, "", "/");
});

describe("old /app#section links", () => {
  it.each([
    ["#shopping-list", "/app/list"],
    ["#my-recipes", "/app/recipes"],
    ["#most-cooked", "/app/leaderboard"],
    ["#my-kitchen", "/app/kitchen"],
  ])("%s goes to %s", (hash, route) => {
    expect(routeForHash(hash)).toBe(route);
    window.history.replaceState(null, "", `/app${hash}`);
    render(<LegacyHashRedirect />);
    expect(replace).toHaveBeenCalledWith(route);
  });

  it.each(["", "#cook", "#top", "#javascript:alert(1)"])("stays put for %p", (hash) => {
    expect(routeForHash(hash)).toBeNull();
    window.history.replaceState(null, "", `/app${hash}`);
    render(<LegacyHashRedirect />);
    expect(replace).not.toHaveBeenCalled();
  });

  it("also follows a hash change while /app is open", () => {
    window.history.replaceState(null, "", "/app");
    render(<LegacyHashRedirect />);
    expect(replace).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/app#my-kitchen");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(replace).toHaveBeenCalledWith("/app/kitchen");
  });
});
