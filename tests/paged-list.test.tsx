import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { filterAndPage, usePagedList } from "@/lib/use-paged-list";

const ITEMS = Array.from({ length: 25 }, (_, i) => ({ title: i % 5 === 0 ? `Fried Rice ${i}` : `Dish ${i}` }));
const text = (item: { title: string }) => item.title;

describe("filterAndPage", () => {
  it("shows the first page and reports what is left", () => {
    const page = filterAndPage(ITEMS, "", 1, 10, text);
    expect(page.visible).toHaveLength(10);
    expect(page).toMatchObject({ total: 25, matched: 25, hasMore: true });
  });

  it("grows by whole pages and stops at the end", () => {
    expect(filterAndPage(ITEMS, "", 3, 10, text)).toMatchObject({ hasMore: false });
    expect(filterAndPage(ITEMS, "", 3, 10, text).visible).toHaveLength(25);
  });

  it("filters case-insensitively, trimmed, before paging", () => {
    const page = filterAndPage(ITEMS, "  FRIED ", 1, 2, text);
    expect(page.visible.map(text)).toEqual(["Fried Rice 0", "Fried Rice 5"]);
    expect(page).toMatchObject({ total: 25, matched: 5, hasMore: true });
  });
});

describe("usePagedList", () => {
  it("pages with showMore and resets to page one when the query changes", () => {
    const { result } = renderHook(() => usePagedList(ITEMS, { size: 10, text }));
    expect(result.current.visible).toHaveLength(10);
    act(() => result.current.showMore());
    expect(result.current.visible).toHaveLength(20);
    act(() => result.current.setQuery("fried"));
    expect(result.current.visible).toHaveLength(5);
    act(() => result.current.setQuery(""));
    expect(result.current.visible).toHaveLength(10);
  });
});
