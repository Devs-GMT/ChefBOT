import { keccak256 } from "viem";
import { describe, expect, it } from "vitest";

import { MAX_TITLE_BYTES, normalizeTitle, recipeKey, trimTitle } from "@/lib/recipe-key";

describe("normalizeTitle", () => {
  it("trims leading and trailing ASCII whitespace", () => {
    expect(normalizeTitle("  Fried Rice\t")).toBe("fried rice");
    expect(normalizeTitle("\n\r Fried Rice \t")).toBe("fried rice");
  });

  it("lowercases ASCII letters only", () => {
    expect(normalizeTitle("Garlic Egg Fried Rice")).toBe("garlic egg fried rice");
  });

  it("leaves non-ASCII bytes unchanged", () => {
    expect(normalizeTitle("RÖSTI")).toBe("rÖsti");
    expect(normalizeTitle("rösti")).toBe("rösti");
  });

  it("does not trim whitespace in the middle", () => {
    expect(normalizeTitle("Fried  Rice")).toBe("fried  rice");
  });

  it("keeps internal punctuation and digits", () => {
    expect(normalizeTitle(" Curry & Rösti 2! ")).toBe("curry & rösti 2!");
  });

  it("handles empty and whitespace-only strings", () => {
    expect(normalizeTitle("")).toBe("");
    expect(normalizeTitle("   \t\n")).toBe("");
  });

  it("preserves emoji (multibyte UTF-8)", () => {
    expect(normalizeTitle("🍳 Fried 🍚")).toBe("🍳 fried 🍚");
  });
});

describe("trimTitle (display form)", () => {
  it("trims but preserves original casing", () => {
    expect(trimTitle("  Fried Rice ")).toBe("Fried Rice");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(trimTitle("  \t ")).toBe("");
  });
});

describe("recipeKey", () => {
  it("produces one key for capitalization and whitespace variants", () => {
    const canonical = recipeKey("Fried Rice");
    expect(recipeKey("fried rice")).toBe(canonical);
    expect(recipeKey(" fried rice ")).toBe(canonical);
    expect(recipeKey("\tFRIED RICE\n")).toBe(canonical);
    expect(recipeKey("Fried   Rice")).not.toBe(canonical);
  });

  it("matches keccak256 of the ASCII-lowercased UTF-8 bytes", () => {
    expect(recipeKey("Fried Rice")).toBe(
      keccak256(new TextEncoder().encode("fried rice")),
    );
  });

  it("matches the shared anchors used by the contract test suite", () => {
    expect(recipeKey("Fried Rice")).toBe(
      "0x52d7d42a467f5ae80877e24ce4b7bdfdcbc7a3ccc2144b23b666d3efbf545395",
    );
    expect(recipeKey("Garlic Egg Fried Rice")).toBe(
      "0x4f569f3508f0a6af823f4b1c2fcc8506ebfdf818e74fc91451db7e61a0ae4bae",
    );
  });

  it("lowercases ASCII only in mixed non-ASCII titles", () => {
    expect(recipeKey("Rösti")).toBe(recipeKey("rösti"));
    expect(recipeKey("RÖSTI")).not.toBe(recipeKey("rösti"));
  });

  it("is a 32-byte hex value", () => {
    expect(recipeKey("Fried Rice")).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("differs for distinct normalized titles", () => {
    expect(recipeKey("Fried Rice")).not.toBe(recipeKey("Fried Rice III"));
  });
});

describe("limits", () => {
  it("exposes a 64-byte title cap matching the contract", () => {
    expect(MAX_TITLE_BYTES).toBe(64);
    const sixtyFour = "a".repeat(MAX_TITLE_BYTES);
    const sixtyFive = "a".repeat(MAX_TITLE_BYTES + 1);
    expect(new TextEncoder().encode(sixtyFour).length).toBe(64);
    expect(new TextEncoder().encode(sixtyFive).length).toBe(65);
  });
});
