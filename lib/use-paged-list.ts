"use client";

import { useState } from "react";

export interface Page<T> {
  visible: T[];
  /** Items before filtering. */
  total: number;
  /** Items matching the query. */
  matched: number;
  hasMore: boolean;
}

/**
 * Filter by a case-insensitive substring, then show `pages` pages of
 * `size`. Pure, so lists that grow with on-chain data or local storage
 * stay short and searchable.
 */
export function filterAndPage<T>(
  items: readonly T[],
  query: string,
  pages: number,
  size: number,
  text: (item: T) => string,
): Page<T> {
  const needle = query.trim().toLowerCase();
  const matches = needle ? items.filter((item) => text(item).toLowerCase().includes(needle)) : [...items];
  const limit = Math.max(1, pages) * size;
  return {
    visible: matches.slice(0, limit),
    total: items.length,
    matched: matches.length,
    hasMore: matches.length > limit,
  };
}

/** State wrapper: query + page count; a new query starts at page one. */
export function usePagedList<T>(
  items: readonly T[],
  { size, text }: { size: number; text: (item: T) => string },
) {
  const [query, setQueryState] = useState("");
  const [pages, setPages] = useState(1);
  const page = filterAndPage(items, query, pages, size, text);
  return {
    ...page,
    query,
    setQuery(next: string) {
      setQueryState(next);
      setPages(1);
    },
    showMore() {
      setPages((current) => current + 1);
    },
  };
}
