import { useState } from "react";

/** Case-insensitive "contains" filter; a blank query keeps every item. */
export function filterByQuery<T>(
  items: readonly T[],
  query: string,
  text: (item: T) => string,
): T[] {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return [...items];
  return items.filter((item) => text(item).toLowerCase().includes(wanted));
}

/** One page of `size` items; out-of-range pages clamp to the nearest one. */
export function pageOf<T>(
  items: readonly T[],
  page: number,
  size: number,
): { items: T[]; page: number; pageCount: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const clamped = Math.min(Math.max(0, page), pageCount - 1);
  return {
    items: items.slice(clamped * size, clamped * size + size),
    page: clamped,
    pageCount,
  };
}

/**
 * "Show more" over a list: the first `step` items, growing by `step` per
 * call. Changing `resetKey` (e.g. the search query) starts over.
 */
export function useShowMore<T>(items: readonly T[], step: number, resetKey = "") {
  const [state, setState] = useState({ key: resetKey, limit: step });
  // Reset during render when the key changes (React's "adjust state" pattern).
  if (state.key !== resetKey) setState({ key: resetKey, limit: step });
  const limit = state.key === resetKey ? state.limit : step;
  return {
    visible: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
    showMore: () => setState((s) => ({ ...s, limit: s.limit + step })),
  };
}
