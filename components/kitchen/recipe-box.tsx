"use client";

import { useState, type ReactNode } from "react";

import { RecipeCard } from "@/components/kitchen/recipe-card";
import { filterByQuery, useShowMore } from "@/lib/paged-list";
import { normalizeTitle, type Recipe } from "@/shared/recipe-schema";

type Band = "all" | "quick" | "weeknight" | "slow";

const BANDS: Array<{ id: Band; label: string }> = [
  { id: "all", label: "All" },
  { id: "quick", label: "≤15 min" },
  { id: "weeknight", label: "16–30 min" },
  { id: "slow", label: "30+ min" },
];

/** Each time band gets its own index-card tab colour and name. */
const TAB: Record<Exclude<Band, "all">, { name: string; className: string }> = {
  quick: { name: "Quick", className: "bg-alert text-white" },
  weeknight: { name: "Weeknight", className: "bg-ink text-white" },
  slow: { name: "Slow cook", className: "bg-stone text-ink" },
};

/** Cards shown before "Show more"; the search appears from SEARCH_FROM recipes. */
const CARD_STEP = 8;
const SEARCH_FROM = 7;

export function timeBand(minutes: number): Exclude<Band, "all"> {
  return minutes <= 15 ? "quick" : minutes <= 30 ? "weeknight" : "slow";
}

const PILL = "min-h-10 rounded-full px-4 text-sm font-medium transition-colors";

/**
 * Own recipes as a recipe box: compact index cards filed by cooking time,
 * a time filter, a search for big boxes, and one card opened in full.
 */
export function RecipeBox({
  recipes,
  openTitle,
  onOpen,
  actions,
}: {
  recipes: Recipe[];
  openTitle: string | null;
  onOpen: (title: string | null) => void;
  actions: (recipe: Recipe) => ReactNode;
}) {
  const [band, setBand] = useState<Band>("all");
  const [query, setQuery] = useState("");

  const inBand = band === "all" ? recipes : recipes.filter((r) => timeBand(r.minutes) === band);
  const matched = filterByQuery(inBand, query, (r) => r.title);
  const { visible, remaining, showMore } = useShowMore(matched, CARD_STEP, `${band}|${query}`);
  const openKey = openTitle === null ? null : normalizeTitle(openTitle);
  const open = recipes.find((r) => normalizeTitle(r.title) === openKey);

  return (
    <div className="mt-6 rounded-[28px] bg-wheat p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Cooking time" className="flex flex-wrap gap-1.5">
          {BANDS.map(({ id, label }) => {
            const count = id === "all" ? recipes.length : recipes.filter((r) => timeBand(r.minutes) === id).length;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={band === id}
                onClick={() => setBand(id)}
                className={`${PILL} ${band === id ? "bg-ink text-white" : "bg-paper text-ink hover:bg-parchment"}`}
              >
                {label} <span className="font-mono text-xs opacity-60 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        {recipes.length >= SEARCH_FROM && (
          <input
            type="search"
            aria-label="Search your recipes"
            placeholder="Search your recipes…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-10 w-full rounded-full border border-fog bg-paper px-4 text-sm text-ink placeholder:text-brick sm:w-60"
          />
        )}
      </div>

      <ul aria-label="Recipe box" className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-2 lg:grid-cols-4">
        {visible.map((recipe) => {
          const tab = TAB[timeBand(recipe.minutes)];
          const isOpen = normalizeTitle(recipe.title) === openKey;
          return (
            <li key={recipe.title} className="pt-4">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`${recipe.title}, ${recipe.minutes} min`}
                onClick={() => onOpen(isOpen ? null : recipe.title)}
                className={`relative flex h-full w-full flex-col rounded-r-xl rounded-bl-xl border bg-paper p-3 text-left sm:p-4 shadow-card transition-transform hover:-translate-y-0.5 ${
                  isOpen ? "border-ink" : "border-fog"
                }`}
              >
                <span
                  className={`absolute -top-4 left-0 rounded-t-lg px-3 py-1 font-mono text-[10px] tracking-[0.08em] uppercase ${tab.className}`}
                >
                  {tab.name}
                </span>
                <span className="flex items-start gap-3">
                  <span aria-hidden="true" className="text-2xl leading-none sm:text-3xl">
                    {recipe.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-sm leading-tight sm:text-[15px] font-bold tracking-[-0.01em] text-ink">
                      {recipe.title}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="index-ruled mt-3 line-clamp-2 h-12 text-[13px] leading-6 text-brick"
                >
                  {recipe.steps.join(" ")}
                </span>
                <span className="mt-2 flex items-center justify-between font-mono text-[11px] tracking-[0.04em] text-brick tabular-nums">
                  <span>{recipe.minutes} min</span>
                  <span>
                    {recipe.steps.length} step{recipe.steps.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {matched.length === 0 && (
        <p role="status" className="py-6 text-center text-sm text-brick">
          No recipe in this part of the box.
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

      {open && (
        <div className="mt-4">
          <RecipeCard
            key={open.title}
            recipe={open}
            index={recipes.indexOf(open)}
            total={recipes.length}
            archive={false}
            actions={actions(open)}
          />
        </div>
      )}
    </div>
  );
}
