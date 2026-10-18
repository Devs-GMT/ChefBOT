"use client";

import { useState } from "react";

import type { DishEntry } from "@/lib/contract";
import { filterByQuery, useShowMore } from "@/lib/paged-list";

export interface RankedDish extends DishEntry {
  rank: number;
}

/** Ladder rows shown before "Show more" (and the threshold for search). */
const LADDER_STEP = 8;

/** Podium order left to right: silver, gold, bronze. */
const PODIUM_ORDER: Record<number, number> = { 1: 2, 2: 1, 3: 3 };
const PODIUM_HEIGHT: Record<number, string> = { 1: "h-44 sm:h-60", 2: "h-32 sm:h-44", 3: "h-24 sm:h-36" };
const PODIUM_TINT: Record<number, string> = { 1: "bg-alert", 2: "bg-alert/85", 3: "bg-alert/70" };

export function cooksLabel(cooks: number) {
  return `${cooks} cook${cooks === 1 ? "" : "s"}`;
}

interface ChartProps {
  dishes: RankedDish[];
  openKey: string | null;
  onToggle: (key: string) => void;
}

/**
 * Top three on a podium: the step heights are fixed by rank, the cook count
 * is set huge on each red step, and the dish stands on top of it.
 */
export function Podium({ dishes, openKey, onToggle }: ChartProps) {
  return (
    <ol aria-label="Top 3" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {dishes.map((dish) => {
        const isOpen = dish.key === openKey;
        return (
          <li
            key={dish.key}
            data-rank={dish.rank}
            style={{ order: PODIUM_ORDER[dish.rank] }}
            className="flex min-w-0 flex-col items-center text-center"
          >
            <span
              aria-hidden="true"
              className={`podium-pop text-[clamp(2.5rem,7vw,72px)] leading-none ${dish.rank === 1 ? "" : "scale-90"}`}
              style={{ animationDelay: `${(PODIUM_ORDER[dish.rank] ?? 1) * 90}ms` }}
            >
              {dish.emoji}
            </span>
            <p className="mt-2 line-clamp-2 min-h-[2.5em] px-1 text-sm leading-tight font-medium text-ink sm:text-base">
              {dish.title}
            </p>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls="dish-detail"
              aria-label={`${dish.title}, ${cooksLabel(dish.cooks)}`}
              onClick={() => onToggle(dish.key)}
              className={`bar-grow group relative mt-3 flex w-full flex-col items-center justify-start overflow-hidden rounded-t-2xl pt-3 text-white transition-[background-color,filter] sm:pt-4 ${PODIUM_HEIGHT[dish.rank]} ${
                isOpen ? "bg-ink" : `${PODIUM_TINT[dish.rank]} hover:brightness-110`
              }`}
              style={{ animationDelay: `${(PODIUM_ORDER[dish.rank] ?? 1) * 80}ms` }}
            >
              <span className="text-[clamp(1.75rem,5vw,56px)] leading-[0.9] font-bold tracking-[-0.03em] tabular-nums">
                {dish.cooks}
              </span>
              <span className="mt-1 font-mono text-[10px] tracking-[0.08em] uppercase opacity-80">
                cook{dish.cooks === 1 ? "" : "s"}
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 left-2 text-[clamp(2.5rem,7vw,88px)] leading-none font-bold tracking-[-0.05em] text-white/20 tabular-nums sm:left-4"
              >
                {dish.rank}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Rank 4 and below as a chart "ladder": big rank numeral, the dish, and a
 * thin red bar scaled to the leader. Long lists page and gain a search.
 */
export function Ladder({ dishes, maxCooks, openKey, onToggle }: ChartProps & { maxCooks: number }) {
  const [query, setQuery] = useState("");
  const matched = filterByQuery(dishes, query, (dish) => dish.title);
  const { visible, remaining, showMore } = useShowMore(matched, LADDER_STEP, query);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2">
        <p className="font-mono text-xs tracking-[0.06em] text-ink uppercase">The ladder</p>
        {dishes.length > LADDER_STEP && (
          <input
            type="search"
            aria-label="Find a dish"
            placeholder="Find a dish…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-10 w-full rounded-full border border-fog bg-parchment px-4 text-sm text-ink placeholder:text-brick sm:w-56"
          />
        )}
      </div>

      <ol aria-label="Rank 4 and below" className="divide-y divide-fog">
        {visible.map((dish) => {
          const isOpen = dish.key === openKey;
          const width = Math.max(4, Math.round((dish.cooks / maxCooks) * 100));
          return (
            <li key={dish.key}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls="dish-detail"
                aria-label={`${dish.title}, ${cooksLabel(dish.cooks)}`}
                onClick={() => onToggle(dish.key)}
                className={`grid w-full grid-cols-[2.75rem_auto_1fr_auto] items-center gap-3 px-1 py-3 text-left transition-colors sm:grid-cols-[4rem_auto_1fr_auto] ${
                  isOpen ? "bg-wheat" : "hover:bg-parchment"
                }`}
              >
                <span className="font-mono text-lg font-medium text-brick tabular-nums sm:text-2xl">
                  #{dish.rank}
                </span>
                <span aria-hidden="true" className="text-2xl">
                  {dish.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-ink">{dish.title}</span>
                  <span aria-hidden="true" className="mt-1.5 block h-1.5 rounded-full bg-fog">
                    <span className="block h-full rounded-full bg-alert" style={{ width: `${width}%` }} />
                  </span>
                </span>
                <span className="text-right text-sm font-medium text-alert tabular-nums">
                  {cooksLabel(dish.cooks)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {matched.length === 0 && (
        <p role="status" className="py-6 text-center text-sm text-brick">
          No dish matches “{query.trim()}”.
        </p>
      )}
      {remaining > 0 && (
        <button
          type="button"
          onClick={showMore}
          className="mt-4 min-h-11 w-full rounded-full border-[1.5px] border-ink text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Show more ({remaining} left)
        </button>
      )}
    </div>
  );
}
