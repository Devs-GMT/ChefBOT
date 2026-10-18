import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KitchenTabs, KITCHEN_TABS } from "@/components/kitchen/kitchen-tabs";
import { addShoppingItems, clearShoppingList } from "@/lib/shopping-list";
import { renderWithProviders } from "./render-with-providers";

function Counter() {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN(n + 1)}>
      clicked {n}
    </button>
  );
}

const PANELS = {
  cook: <Counter />,
  "shopping-list": <p>shopping panel</p>,
  "my-recipes": <p>mine panel</p>,
  "most-cooked": <p>ranking panel</p>,
  "my-kitchen": <p>kitchen panel</p>,
};

function setHash(hash: string) {
  act(() => {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

beforeEach(() => {
  window.history.replaceState(null, "", "/app");
  window.localStorage.clear();
  clearShoppingList();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("KitchenTabs", () => {
  it("lists the five workspace tabs and opens Cook by default", () => {
    renderWithProviders(<KitchenTabs panels={PANELS} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Cook", "List", "Mine", "Most Cooked", "My Kitchen"]);
    expect(KITCHEN_TABS.map((t) => t.id)).toEqual(["cook", "shopping-list", "my-recipes", "most-cooked", "my-kitchen"]);
    expect(screen.getByRole("tab", { name: "Cook" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("clicked 0");
  });

  it("shows one panel at a time but keeps the others mounted (state survives)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<KitchenTabs panels={PANELS} />);
    await user.click(screen.getByRole("button", { name: "clicked 0" }));
    await user.click(screen.getByRole("tab", { name: "Most Cooked" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("ranking panel");
    expect(screen.getByText("clicked 1", { selector: "button" })).not.toBeVisible();
    expect(window.location.hash).toBe("#most-cooked");

    await user.click(screen.getByRole("tab", { name: "Cook" }));
    expect(screen.getByRole("button", { name: "clicked 1" })).toBeVisible();
  });

  it("follows the URL hash, including links and Back", async () => {
    window.history.replaceState(null, "", "/app#my-kitchen");
    renderWithProviders(<KitchenTabs panels={PANELS} />);
    expect(screen.getByRole("tab", { name: "My Kitchen" })).toHaveAttribute("aria-selected", "true");

    setHash("#shopping-list");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("shopping panel");

    setHash("#nonsense");
    expect(screen.getByRole("tab", { name: "Cook" })).toHaveAttribute("aria-selected", "true");

    act(() => {
      window.history.replaceState(null, "", "/app#my-recipes");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("tabpanel")).toHaveTextContent("mine panel");
  });

  it("supports arrow keys, Home and End (roving focus)", () => {
    renderWithProviders(<KitchenTabs panels={PANELS} />);
    const cook = screen.getByRole("tab", { name: "Cook" });
    cook.focus();
    fireEvent.keyDown(cook, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "List" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "List" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("tab", { name: "My Kitchen" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Cook" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Cook" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "List" })).toHaveAttribute("tabindex", "-1");
  });

  it("badges the list with open items", () => {
    renderWithProviders(<KitchenTabs panels={PANELS} />);
    act(() => addShoppingItems(["garlic", "lemon"]));
    expect(screen.getByRole("tab", { name: "List, 2 items" })).toBeInTheDocument();
  });
});
