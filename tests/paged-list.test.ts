import { describe, expect, it } from "vitest";

import { filterByQuery, pageOf } from "@/lib/paged-list";

const DISHES = ["Fried Rice", "Ramen", "Tomato Omelette", "Rice Porridge", "Bánh Mì"];

describe("filterByQuery", () => {
  it("keeps everything for a blank query", () => {
    expect(filterByQuery(DISHES, "  ", (d) => d)).toEqual(DISHES);
  });

  it("matches case-insensitively anywhere in the text", () => {
    expect(filterByQuery(DISHES, "RICE", (d) => d)).toEqual(["Fried Rice", "Rice Porridge"]);
    expect(filterByQuery(DISHES, "mì", (d) => d)).toEqual(["Bánh Mì"]);
  });
});

describe("pageOf", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("slices one page and counts pages", () => {
    expect(pageOf(items, 0, 12)).toEqual({ items: items.slice(0, 12), page: 0, pageCount: 3 });
    expect(pageOf(items, 2, 12)).toEqual({ items: [24], page: 2, pageCount: 3 });
  });

  it("clamps out-of-range pages and handles an empty list", () => {
    expect(pageOf(items, 9, 12).page).toBe(2);
    expect(pageOf(items, -3, 12).page).toBe(0);
    expect(pageOf([], 4, 12)).toEqual({ items: [], page: 0, pageCount: 1 });
  });
});
