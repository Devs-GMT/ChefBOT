"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

import { useMyRecipes } from "@/lib/my-recipes";
import { useShoppingList } from "@/lib/shopping-list";

/** Workspace tabs; ids double as the URL hash (and the old section anchors). */
export const KITCHEN_TABS = [
  { id: "cook", label: "Cook" },
  { id: "shopping-list", label: "List" },
  { id: "my-recipes", label: "Mine" },
  { id: "most-cooked", label: "Most Cooked" },
  { id: "my-kitchen", label: "My Kitchen" },
] as const;

export type KitchenTabId = (typeof KITCHEN_TABS)[number]["id"];

const IDS = new Set<string>(KITCHEN_TABS.map((tab) => tab.id));
const DEFAULT_TAB: KitchenTabId = "cook";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function activeFromHash(): KitchenTabId {
  const hash = window.location.hash.slice(1);
  return (IDS.has(hash) ? hash : DEFAULT_TAB) as KitchenTabId;
}

/**
 * /app as a workspace (v1.1): one sticky pill tab bar and one visible panel,
 * so the page no longer grows into a long scroll as data piles up. Panels
 * stay mounted (just hidden) so recipe results, drafts and queries survive
 * a switch. The URL hash is the source of truth — existing `#section`
 * links, the pill nav and Back all keep working.
 */
export function KitchenTabs({ panels }: { panels: Record<KitchenTabId, ReactNode> }) {
  const active = useSyncExternalStore(subscribe, activeFromHash, () => DEFAULT_TAB);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const openItems = useShoppingList().filter((item) => !item.done).length;
  const myRecipes = useMyRecipes().length;

  const badges: Partial<Record<KitchenTabId, { count: number; noun: string }>> = {
    "shopping-list": { count: openItems, noun: "item" },
    "my-recipes": { count: myRecipes, noun: "recipe" },
  };

  function select(id: KitchenTabId, focus = false) {
    if (id !== active) {
      window.history.pushState(null, "", `#${id}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    if (focus) {
      tabRefs.current[KITCHEN_TABS.findIndex((tab) => tab.id === id)]?.focus();
    }
    // Keep the bar in view when switching from deep inside a long panel.
    const bar = barRef.current;
    if (bar && bar.getBoundingClientRect().top < 0) {
      bar.scrollIntoView?.({ block: "start" });
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = KITCHEN_TABS.findIndex((tab) => tab.id === active);
    const count = KITCHEN_TABS.length;
    const go = (next: number) => {
      event.preventDefault();
      select(KITCHEN_TABS[(next + count) % count]!.id, true);
    };
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(count - 1);
  }

  return (
    <div>
      <div
        ref={barRef}
        className="sticky top-[76px] z-40 scroll-mt-24 border-b border-fog bg-parchment/90 backdrop-blur sm:top-[84px]"
      >
        <div
          role="tablist"
          aria-label="Kitchen"
          className="mx-auto flex w-full max-w-6xl gap-1.5 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6"
        >
          {KITCHEN_TABS.map((tab, index) => {
            const selected = tab.id === active;
            const badge = badges[tab.id];
            const name =
              badge && badge.count > 0
                ? `${tab.label}, ${badge.count} ${badge.noun}${badge.count === 1 ? "" : "s"}`
                : undefined;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                aria-label={name}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.id)}
                onKeyDown={onKeyDown}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
                  selected ? "bg-ink text-white" : "text-ink hover:bg-wheat"
                }`}
              >
                {tab.label}
                {badge && badge.count > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`flex min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] tabular-nums ${
                      selected ? "bg-alert text-white" : "bg-ink text-white"
                    }`}
                  >
                    {badge.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {KITCHEN_TABS.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="kitchen-panel"
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
