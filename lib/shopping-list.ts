"use client";

import { useSyncExternalStore } from "react";

import { INGREDIENT_GROUPS } from "@/shared/ingredients";

/**
 * Shopping list (v1.1): recipe "missing" items the cook wants to buy.
 * Lives only in this browser (no accounts, no database). Storage can be
 * blocked or corrupt, so every read/write is guarded and the list keeps
 * working in memory.
 */

export const SHOPPING_STORAGE_KEY = "chefbot.shopping.v1";
export const MAX_SHOPPING_ITEMS = 50;
const MAX_NAME_LENGTH = 40;

export interface ShoppingItem {
  /** Trimmed, lowercased name (doubles as the de-dup key). */
  name: string;
  done: boolean;
}

const EMPTY: ShoppingItem[] = [];
const LABELS = new Map(
  INGREDIENT_GROUPS.flatMap((group) => group.ingredients).map((i) => [i.id, i.label]),
);

let items: ShoppingItem[] | null = null;
const listeners = new Set<() => void>();

function normalize(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const clean = name.trim().toLowerCase();
  return clean && clean.length <= MAX_NAME_LENGTH ? clean : null;
}

function load(): ShoppingItem[] {
  try {
    const raw = window.localStorage.getItem(SHOPPING_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const seen = new Set<string>();
    const out: ShoppingItem[] = [];
    for (const entry of parsed) {
      const name = normalize((entry as { name?: unknown } | null)?.name);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, done: (entry as { done?: unknown }).done === true });
      if (out.length === MAX_SHOPPING_ITEMS) break;
    }
    return out;
  } catch {
    return EMPTY;
  }
}

function commit(next: ShoppingItem[]) {
  items = next;
  try {
    window.localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota: keep the in-memory list.
  }
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== SHOPPING_STORAGE_KEY) return;
    items = load();
    listeners.forEach((listener) => listener());
  });
}

export function getShoppingList(): ShoppingItem[] {
  if (items === null) items = typeof window === "undefined" ? EMPTY : load();
  return items;
}

export function addShoppingItems(names: readonly string[]) {
  const next = [...getShoppingList()];
  let changed = false;
  for (const raw of names) {
    const name = normalize(raw);
    if (!name) continue;
    const index = next.findIndex((item) => item.name === name);
    if (index >= 0) {
      if (next[index].done) {
        next[index] = { name, done: false };
        changed = true;
      }
    } else if (next.length < MAX_SHOPPING_ITEMS) {
      next.push({ name, done: false });
      changed = true;
    }
  }
  if (changed) commit(next);
}

export function toggleShoppingItem(name: string) {
  const key = normalize(name);
  commit(getShoppingList().map((item) => (item.name === key ? { ...item, done: !item.done } : item)));
}

export function removeDoneItems() {
  commit(getShoppingList().filter((item) => !item.done));
}

export function clearShoppingList() {
  commit(EMPTY);
}

export function subscribeShoppingList(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useShoppingList(): ShoppingItem[] {
  return useSyncExternalStore(subscribeShoppingList, getShoppingList, () => EMPTY);
}

/** Chip label for a vocabulary id, otherwise the AI's own wording. */
export function shoppingLabel(name: string): string {
  return LABELS.get(name) ?? name;
}

/** Plain-text checklist for copy / share; open items first. */
export function formatShoppingList(list: readonly ShoppingItem[]): string {
  const ordered = [...list.filter((i) => !i.done), ...list.filter((i) => i.done)];
  return [
    "ChefBOT shopping list",
    ...ordered.map((item) => `- [${item.done ? "x" : " "}] ${shoppingLabel(item.name)}`),
  ].join("\n");
}

export interface ShoppingGroup {
  id: string;
  title: string;
  items: ShoppingItem[];
}

const GROUP_OF = new Map(
  INGREDIENT_GROUPS.flatMap((group) => group.ingredients.map((i) => [i.id, group.id] as const)),
);

/** Receipt sections: food groups in picker order, the AI's free-text items last as "Other". */
export function groupShoppingItems(list: readonly ShoppingItem[]): ShoppingGroup[] {
  const groups: ShoppingGroup[] = [
    ...INGREDIENT_GROUPS.map((group) => ({ id: group.id, title: group.title, items: [] as ShoppingItem[] })),
    { id: "other", title: "Other", items: [] },
  ];
  for (const item of list) {
    const id = GROUP_OF.get(item.name) ?? "other";
    groups.find((group) => group.id === id)!.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}
