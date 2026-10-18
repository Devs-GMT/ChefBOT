import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SHOPPING_STORAGE_KEY,
  MAX_SHOPPING_ITEMS,
  addShoppingItems,
  clearShoppingList,
  formatShoppingList,
  getShoppingList,
  groupShoppingItems,
  removeDoneItems,
  shoppingLabel,
  subscribeShoppingList,
  toggleShoppingItem,
} from "@/lib/shopping-list";

beforeEach(() => {
  window.localStorage.clear();
  clearShoppingList();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shopping list store", () => {
  it("starts empty", () => {
    expect(getShoppingList()).toEqual([]);
  });

  it("adds items, trimmed and de-duplicated case-insensitively", () => {
    addShoppingItems(["Garlic", " butter "]);
    addShoppingItems(["garlic", "BUTTER", "lemon", ""]);
    expect(getShoppingList().map((item) => item.name)).toEqual([
      "garlic",
      "butter",
      "lemon",
    ]);
  });

  it("toggles done and removes checked items", () => {
    addShoppingItems(["garlic", "butter"]);
    toggleShoppingItem("garlic");
    expect(getShoppingList()).toEqual([
      { name: "garlic", done: true },
      { name: "butter", done: false },
    ]);
    removeDoneItems();
    expect(getShoppingList()).toEqual([{ name: "butter", done: false }]);
  });

  it("re-adding a checked item un-checks it", () => {
    addShoppingItems(["garlic"]);
    toggleShoppingItem("garlic");
    addShoppingItems(["Garlic"]);
    expect(getShoppingList()).toEqual([{ name: "garlic", done: false }]);
  });

  it("persists to localStorage under a versioned key", () => {
    addShoppingItems(["lemon"]);
    const raw = window.localStorage.getItem(SHOPPING_STORAGE_KEY);
    expect(JSON.parse(raw ?? "null")).toEqual([{ name: "lemon", done: false }]);
  });

  it("reads back what another tab stored", () => {
    window.localStorage.setItem(
      SHOPPING_STORAGE_KEY,
      JSON.stringify([{ name: "rice", done: true }]),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: SHOPPING_STORAGE_KEY }));
    expect(getShoppingList()).toEqual([{ name: "rice", done: true }]);
  });

  it("ignores corrupt or hostile stored data", () => {
    window.localStorage.setItem(SHOPPING_STORAGE_KEY, "{not json");
    window.dispatchEvent(new StorageEvent("storage", { key: SHOPPING_STORAGE_KEY }));
    expect(getShoppingList()).toEqual([]);

    window.localStorage.setItem(
      SHOPPING_STORAGE_KEY,
      JSON.stringify([{ name: 42 }, { name: "x".repeat(500), done: false }, { name: "ok", done: "yes" }]),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: SHOPPING_STORAGE_KEY }));
    expect(getShoppingList()).toEqual([{ name: "ok", done: false }]);
  });

  it("keeps working in memory when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    addShoppingItems(["egg"]);
    expect(getShoppingList()).toEqual([{ name: "egg", done: false }]);
  });

  it("caps the list length", () => {
    addShoppingItems(Array.from({ length: MAX_SHOPPING_ITEMS + 10 }, (_, i) => `item ${i}`));
    expect(getShoppingList()).toHaveLength(MAX_SHOPPING_ITEMS);
  });

  it("returns a stable snapshot until something changes", () => {
    addShoppingItems(["egg"]);
    const first = getShoppingList();
    expect(getShoppingList()).toBe(first);
    toggleShoppingItem("egg");
    expect(getShoppingList()).not.toBe(first);
  });

  it("notifies subscribers on change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeShoppingList(listener);
    addShoppingItems(["egg"]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    addShoppingItems(["rice"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("shopping list text", () => {
  it("uses vocabulary labels when the name is a known ingredient id", () => {
    expect(shoppingLabel("chicken breast")).toBe("Chicken breast");
    expect(shoppingLabel("fish sauce")).toBe("fish sauce");
  });

  it("formats open items first as a plain-text checklist", () => {
    const text = formatShoppingList([
      { name: "garlic", done: true },
      { name: "lemon", done: false },
    ]);
    expect(text).toBe("ChefBOT shopping list\n- [ ] Lemon\n- [x] Garlic");
  });
});

describe("groupShoppingItems (receipt sections)", () => {
  it("groups known ids by food group in picker order, free text last under Other", () => {
    const groups = groupShoppingItems([
      { name: "garlic", done: false },
      { name: "fish sauce", done: false },
      { name: "lemon", done: true },
      { name: "rice", done: false },
      { name: "egg", done: false },
    ]);
    expect(groups.map((g) => [g.title, g.items.map((i) => i.name)])).toEqual([
      ["Protein & Fats", ["egg"]],
      ["Vegetables & Fruits", ["lemon"]],
      ["Grains", ["rice"]],
      ["Pantry", ["garlic"]],
      ["Other", ["fish sauce"]],
    ]);
  });

  it("drops empty groups", () => {
    expect(groupShoppingItems([{ name: "rice", done: false }]).map((g) => g.title)).toEqual(["Grains"]);
    expect(groupShoppingItems([])).toEqual([]);
  });
});
