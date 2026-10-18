"use client";

import { useState, useSyncExternalStore } from "react";

import {
  groupShoppingItems,
  shoppingLabel,
  toggleShoppingItem,
  type ShoppingGroup,
  type ShoppingItem,
} from "@/lib/shopping-list";

const noSubscribe = () => () => {};
/** Open items printed before the receipt folds the rest behind "Print all". */
const PRINTED = 12;
// Client-only: the server has no idea what day it is for the shopper.
const today = () =>
  new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

/** The first `limit` rows across the groups, keeping food-group order. */
function firstRows(groups: ShoppingGroup[], limit: number): ShoppingGroup[] {
  const cut: ShoppingGroup[] = [];
  let left = limit;
  for (const group of groups) {
    if (left <= 0) break;
    cut.push({ ...group, items: group.items.slice(0, left) });
    left -= group.items.length;
  }
  return cut;
}

function ReceiptRow({ item, line }: { item: ShoppingItem; line: number }) {
  return (
    <li className="flex items-center gap-3 rounded-md px-1 hover:bg-wheat/60">
      <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => toggleShoppingItem(item.name)}
          className="size-4 shrink-0 accent-[var(--color-ink)]"
        />
        <span className={`shrink-0 ${item.done ? "text-brick line-through" : "text-ink"}`}>
          {shoppingLabel(item.name)}
        </span>
        <span aria-hidden="true" className="min-w-4 flex-1 translate-y-1 border-b-2 border-dotted border-stone" />
      </label>
      <span aria-hidden="true" className="shrink-0 text-brick tabular-nums">
        {String(line).padStart(2, "0")}
      </span>
    </li>
  );
}

/**
 * The shopping list printed as a till receipt: torn edges, mono type, open
 * items under their food group, checked items folded at the bottom.
 */
export function Receipt({ items }: { items: ShoppingItem[] }) {
  const date = useSyncExternalStore(noSubscribe, today, () => "");
  const open = items.filter((item) => !item.done);
  const done = items.filter((item) => item.done);
  const [printAll, setPrintAll] = useState(false);
  const groups = printAll ? groupShoppingItems(open) : firstRows(groupShoppingItems(open), PRINTED);
  const hidden = printAll ? 0 : Math.max(0, open.length - PRINTED);
  let line = 0;

  return (
    <div className="mx-auto max-w-md drop-shadow-[0_10px_18px_rgba(17,0,0,0.12)]">
      <div className="receipt-edge bg-paper px-5 py-8 font-mono text-[13px] sm:px-8">
        <div className="text-center">
          <p className="text-base font-bold tracking-[0.18em] text-ink">CHEFBOT MARKET</p>
          <p className="mt-1 text-[11px] tracking-[0.08em] text-brick uppercase">
            Shopping list{date ? ` · ${date}` : ""}
          </p>
        </div>
        <hr className="my-4 border-t-2 border-dashed border-stone" />

        <ul aria-label="Items to buy" className="space-y-4">
          {groups.map((group) => (
            <li key={group.id}>
              <h3 className="mb-1 text-[11px] tracking-[0.12em] text-alert uppercase">{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <ReceiptRow key={item.name} item={item} line={++line} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setPrintAll(true)}
            className="mt-3 min-h-10 w-full rounded-md border border-dashed border-stone text-brick transition-colors hover:border-ink hover:text-ink"
          >
            Print all · {hidden} more
          </button>
        )}
        {open.length === 0 && (
          <p className="text-center text-brick">All bought. Time to cook.</p>
        )}

        {done.length > 0 && (
          <details className="mt-4 border-t border-dashed border-stone pt-3">
            <summary className="flex min-h-10 cursor-pointer items-center justify-between text-brick">
              <span>{done.length} checked</span>
              <span aria-hidden="true">▾</span>
            </summary>
            <ul aria-label="Checked items">
              {done.map((item) => (
                <ReceiptRow key={item.name} item={item} line={++line} />
              ))}
            </ul>
          </details>
        )}

        <hr className="my-4 border-t-2 border-dashed border-stone" />
        <p className="flex justify-between font-bold tracking-[0.06em] text-ink uppercase tabular-nums">
          <span>
            Items {items.length} · Checked {done.length}
          </span>
          <span>{open.length} to go</span>
        </p>
        <div
          aria-hidden="true"
          className="mx-auto mt-6 h-10 w-48 bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_2px,transparent_2px_4px,var(--color-ink)_4px_5px,transparent_5px_8px)]"
        />
        <p className="mt-2 text-center text-[11px] tracking-[0.12em] text-brick uppercase">
          Thank you · cook something good
        </p>
      </div>
    </div>
  );
}
