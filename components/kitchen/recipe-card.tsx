"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { CookButton } from "@/components/kitchen/cook-button";
import { addShoppingItems, useShoppingList } from "@/lib/shopping-list";
import type { Recipe } from "@/shared/recipe-schema";

export interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  /** Cards in the set, for the "01 / 03" counter (AI answers are always 3). */
  total?: number;
  /** Share the recipe to the stamp-proven archive after stamping (off for private recipes). */
  archive?: boolean;
  /** Extra controls under the stamp (e.g. Edit / Delete for own recipes). */
  actions?: ReactNode;
}

/**
 * Full-width recipe card (PRD §2): emoji tile, title + time, what it uses
 * from your fridge, missing items in red, numbered steps on demand, and the
 * on-chain stamp in its own column.
 */
export function RecipeCard({ recipe, index, total = 3, archive = true, actions }: RecipeCardProps) {
  const [open, setOpen] = useState(false);
  const shopping = useShoppingList();
  const onList =
    recipe.missing.length > 0 &&
    recipe.missing.every((item) =>
      shopping.some((entry) => !entry.done && entry.name === item.trim().toLowerCase()),
    );
  const stepsId = useId();
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      className="card-rise grid overflow-hidden rounded-[28px] border border-fog bg-paper shadow-card lg:grid-cols-[176px_minmax(0,1fr)_288px]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="relative flex items-center gap-4 bg-wheat p-4 lg:flex-col lg:items-start lg:p-6">
        <span className="font-mono text-xs tracking-[0.06em] text-ink tabular-nums">
          {number} / {String(total).padStart(2, "0")}
        </span>
        <span
          aria-hidden="true"
          className="text-[44px] leading-none drop-shadow-sm lg:my-auto lg:self-center lg:text-[96px]"
        >
          {recipe.emoji}
        </span>
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="8" cy="8" r="6.2" />
              <path d="M8 4.6V8l2.3 1.6" strokeLinecap="round" />
            </svg>
            <span>{recipe.minutes} min</span>
          </span>
          <span className="text-sm font-medium text-ink">
            Uses {recipe.uses.length} of your ingredients
          </span>
        </div>

        <h3 className="mt-3 text-[clamp(1.5rem,3vw,33px)] leading-[1.04] font-bold tracking-[-0.025em] text-ink">
          {recipe.title}
        </h3>

        {recipe.uses.length > 0 && (
          <ul aria-label="From your fridge" className="mt-4 flex flex-wrap gap-1.5">
            {recipe.uses.map((use) => (
              <li
                key={use}
                className="rounded-full border border-fog bg-parchment px-2.5 py-1 text-xs text-ink"
              >
                {use}
              </li>
            ))}
          </ul>
        )}

        {recipe.missing.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.06em] text-alert uppercase">
              Missing
            </span>
            <ul aria-label="Missing ingredients" className="flex flex-wrap gap-1.5">
              {recipe.missing.map((item) => (
                <li
                  key={item}
                  className="rounded-full bg-alert/10 px-2.5 py-1 text-xs font-medium text-alert"
                >
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => addShoppingItems(recipe.missing)}
              disabled={onList}
              aria-label={onList ? "On your list ✓" : "Add missing to shopping list"}
              className="inline-flex min-h-9 items-center rounded-full border border-ink/20 px-3 text-xs font-medium text-ink transition-colors hover:border-ink/50 disabled:border-transparent disabled:text-brick"
            >
              {onList ? "On your list ✓" : "+ Shopping list"}
            </button>
            {onList && (
              <Link
                href="/app/list"
                className="text-xs font-medium text-ink underline underline-offset-2"
              >
                View list
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs font-medium text-ink">
            Nothing missing — you have it all ✓
          </p>
        )}

        {recipe.nutrition && (
          <p className="mt-3 text-xs text-brick">
            <span className="font-medium text-ink">
              ≈ {recipe.nutrition.kcal} kcal · {recipe.nutrition.proteinG} g protein
            </span>{" "}
            <span>· AI estimate per serving, not medical advice</span>
          </p>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={stepsId}
          className="mt-5 flex min-h-11 w-full items-center justify-between rounded-full border border-fog px-4 text-sm font-medium text-ink transition-colors hover:border-ink/40 sm:w-fit sm:gap-6"
        >
          {open ? "Hide steps" : `Show steps (${recipe.steps.length})`}
          <span
            aria-hidden="true"
            className={`font-mono transition-transform duration-300 ${open ? "rotate-45" : ""}`}
          >
            +
          </span>
        </button>

        {open && (
          <ol
            id={stepsId}
            aria-label="Steps"
            className="mt-5 space-y-3 border-t border-fog pt-5"
          >
            {recipe.steps.map((step, stepIndex) => (
              <li key={stepIndex} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs text-white tabular-nums"
                >
                  {stepIndex + 1}
                </span>
                <p className="pt-0.5 text-[15px] leading-[1.45] tracking-[-0.01em] text-ink">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border-t border-fog p-5 sm:p-6 lg:border-t-0 lg:border-l">
        <p className="mb-3 font-mono text-[11px] tracking-[0.06em] text-brick uppercase">
          Cooked it? Stamp it.
        </p>
        <CookButton recipe={recipe} archive={archive} />
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}

/** Placeholder with the same silhouette as a RecipeCard. */
export function RecipeCardSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-[28px] border border-fog bg-paper lg:grid-cols-[176px_minmax(0,1fr)_288px]">
      <div className="h-20 animate-pulse bg-wheat lg:h-auto" />
      <div className="space-y-3 p-6">
        <div className="h-6 w-40 animate-pulse rounded-full bg-wheat" />
        <div className="h-9 w-3/4 animate-pulse rounded-lg bg-wheat" />
        <div className="flex gap-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-wheat" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-wheat" />
          <div className="h-6 w-14 animate-pulse rounded-full bg-wheat" />
        </div>
      </div>
      <div className="hidden p-6 lg:block">
        <div className="h-12 w-full animate-pulse rounded-full bg-wheat" />
      </div>
    </div>
  );
}
