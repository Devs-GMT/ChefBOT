"use client";

import { useId, useState, useSyncExternalStore } from "react";

import { SectionTag } from "@/components/ui/section-tag";
import {
  clearShoppingList,
  formatShoppingList,
  removeDoneItems,
  shoppingLabel,
  toggleShoppingItem,
  useShoppingList,
} from "@/lib/shopping-list";

const ACTION =
  "inline-flex min-h-11 items-center rounded-full border border-fog px-4 text-sm font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-40";

const noSubscribe = () => () => {};
const browserCanShare = () => typeof navigator.share === "function";

/** v1.1 shopping list: the recipes' missing items, kept in this browser. */
export function ShoppingList() {
  const items = useShoppingList();
  const [notice, setNotice] = useState<string | null>(null);
  const canShare = useSyncExternalStore(noSubscribe, browserCanShare, () => false);

  const text = formatShoppingList(items);
  const open = items.filter((item) => !item.done);
  const checked = items.filter((item) => item.done);
  // Bought items fold away so a long list stays a short one.
  const [showChecked, setShowChecked] = useState(false);
  const checkedId = useId();
  const hasDone = items.some((item) => item.done);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied — paste it into your notes or chat.");
    } catch {
      setNotice("Copy isn't available here. Select the list and copy it manually.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "ChefBOT shopping list", text });
    } catch {
      // Cancelled by the user, or the share sheet failed: nothing to do.
    }
  }

  return (
    <section
      id="shopping-list"
      aria-labelledby="shopping-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-16"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTag>For the shop</SectionTag>
          <h2
            id="shopping-heading"
            className="mt-5 text-[clamp(2.25rem,6vw,72px)] leading-[0.92] font-bold tracking-[-0.03em] text-ink"
          >
            Shopping List
          </h2>
        </div>
        <p className="max-w-sm text-base leading-[1.4] tracking-[-0.02em] text-brick">
          What your recipes are missing. Saved only in this browser — no
          account, nothing on-chain.
        </p>
      </div>

      <div className="mt-8 rounded-[28px] border border-fog bg-paper p-4 shadow-card sm:p-8">
        {items.length === 0 ? (
          <p className="text-sm text-brick">
            <span className="font-medium text-ink">Nothing to buy yet.</span>{" "}
            Tap “+ Shopping list” on a recipe and its missing items land here.
          </p>
        ) : (
          <>
            {open.length > 0 ? (
              <ul aria-label="Items to buy" className="grid gap-1 sm:grid-cols-2">
                {open.map((item) => (
                  <ShoppingRow key={item.name} name={item.name} done={false} />
                ))}
              </ul>
            ) : (
              <p className="text-sm font-medium text-ink">All bought ✓</p>
            )}

            {checked.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  aria-expanded={showChecked}
                  aria-controls={checkedId}
                  onClick={() => setShowChecked((value) => !value)}
                  className="flex min-h-11 items-center gap-2 rounded-full px-2 font-mono text-xs tracking-[0.06em] text-brick uppercase hover:text-ink"
                >
                  {checked.length} checked
                  <span aria-hidden="true" className={`transition-transform ${showChecked ? "rotate-90" : ""}`}>
                    ▸
                  </span>
                </button>
                {showChecked && (
                  <ul id={checkedId} aria-label="Checked items" className="grid gap-1 sm:grid-cols-2">
                    {checked.map((item) => (
                      <ShoppingRow key={item.name} name={item.name} done />
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-fog pt-5">
              <button type="button" onClick={copy} className={ACTION}>
                Copy
              </button>
              {canShare && (
                <button type="button" onClick={share} className={ACTION}>
                  Share
                </button>
              )}
              <button
                type="button"
                onClick={removeDoneItems}
                disabled={!hasDone}
                className={ACTION}
              >
                Remove checked
              </button>
              <button
                type="button"
                onClick={() => {
                  clearShoppingList();
                  setNotice(null);
                }}
                className={ACTION}
              >
                Clear all
              </button>
            </div>
          </>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm text-brick">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}

function ShoppingRow({ name, done }: { name: string; done: boolean }) {
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-wheat">
        <input
          type="checkbox"
          checked={done}
          onChange={() => toggleShoppingItem(name)}
          className="size-5 accent-[var(--color-ink)]"
        />
        <span className={`text-[15px] ${done ? "text-brick line-through" : "text-ink"}`}>
          {shoppingLabel(name)}
        </span>
      </label>
    </li>
  );
}
