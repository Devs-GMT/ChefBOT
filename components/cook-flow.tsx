"use client";

import { useState } from "react";

import { IngredientPicker } from "@/components/ingredient-picker";
import { RecipeCard } from "@/components/recipe-card";
import { SectionTag } from "@/components/section-tag";
import { getRecipes, type RecipeResult } from "@/lib/recipes";

const TIME_OPTIONS = [10, 20, 30] as const;

export function CookFlow() {
  const [selected, setSelected] = useState<string[]>([]);
  const [maxMinutes, setMaxMinutes] = useState<number>(20);
  const [vegetarian, setVegetarian] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<RecipeResult | null>(null);

  const canSubmit = selected.length >= 2 && phase !== "loading";

  function toggleIngredient(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setPhase("loading");
    const next = await getRecipes({
      ingredients: selected,
      maxMinutes,
      vegetarian,
    });
    setResult(next);
    setPhase("done");
  }

  const statusText =
    phase === "loading"
      ? "Cooking up three recipes…"
      : phase === "done"
        ? "Three recipes ready."
        : `${selected.length} ingredients selected.`;

  return (
    <section
      id="cook"
      aria-labelledby="cook-heading"
      className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 py-16 sm:px-6"
    >
      <SectionTag>Step one</SectionTag>
      <h2
        id="cook-heading"
        className="mt-6 text-[clamp(2rem,5vw,48px)] leading-[0.96] font-bold tracking-normal text-ink"
      >
        What&apos;s in your kitchen?
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-[1.4] tracking-[-0.02em] text-brick">
        Pick at least two ingredients. ChefBOT returns three recipes that match
        what you already have — pantry gaps included.
      </p>

      <form onSubmit={handleSubmit} className="mt-10">
        <IngredientPicker selected={selected} onToggle={toggleIngredient} />

        <div className="mt-10 flex flex-col gap-8 border-t border-fog pt-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
            <fieldset>
              <legend className="font-mono text-xs tracking-[0.06em] text-ink uppercase">
                Ready in
              </legend>
              <div className="mt-3 flex gap-2">
                {TIME_OPTIONS.map((minutes) => (
                  <label
                    key={minutes}
                    className={
                      maxMinutes === minutes
                        ? "flex min-h-11 cursor-pointer items-center rounded-full bg-ink px-5 text-sm font-medium text-white"
                        : "flex min-h-11 cursor-pointer items-center rounded-full border border-fog px-5 text-sm text-ink/85 transition-colors hover:border-ink/40"
                    }
                  >
                    <input
                      type="radio"
                      name="max-minutes"
                      value={minutes}
                      checked={maxMinutes === minutes}
                      onChange={() => setMaxMinutes(minutes)}
                      className="sr-only"
                    />
                    {minutes} min
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <p
                id="vegetarian-label"
                className="font-mono text-xs tracking-[0.06em] text-ink uppercase"
              >
                Diet
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={vegetarian}
                aria-labelledby="vegetarian-label"
                onClick={() => setVegetarian((value) => !value)}
                className="mt-3 flex min-h-11 items-center gap-3 rounded-full border border-fog px-4 text-sm text-ink/85 transition-colors hover:border-ink/40"
              >
                <span
                  aria-hidden
                  className={
                    vegetarian
                      ? "flex size-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white"
                      : "flex size-6 items-center justify-center rounded-full border border-ash text-transparent"
                  }
                >
                  ✓
                </span>
                Vegetarian only
              </button>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <button
              type="submit"
              disabled={!canSubmit}
              aria-describedby="cook-hint"
              className={
                canSubmit
                  ? "inline-flex min-h-12 items-center rounded-[40px] bg-ink px-8 text-base font-medium text-white transition-colors hover:bg-ink/85"
                  : "inline-flex min-h-12 cursor-not-allowed items-center rounded-[40px] bg-fog px-8 text-base font-medium text-brick"
              }
            >
              {phase === "loading" ? "Thinking…" : "Find recipes"}
            </button>
            <p id="cook-hint" className="text-xs text-brick">
              {selected.length < 2
                ? "Pick at least 2 ingredients to continue."
                : "Three recipes, no signup."}
            </p>
          </div>
        </div>
      </form>

      <p role="status" aria-live="polite" className="mt-8 text-sm text-brick">
        {statusText}
      </p>

      {phase === "done" && result && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-[33px] leading-[1.04] font-bold tracking-[-0.019em] text-ink">
              Tonight&apos;s picks
            </h3>
            {result.source === "fallback" && (
              <span className="rounded-full bg-wheat px-3 py-1 text-xs font-medium text-ink">
                House favourites — curated picks
              </span>
            )}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {result.recipes.map((recipe, index) => (
              <RecipeCard
                key={`${recipe.title}-${index}`}
                recipe={recipe}
                index={index}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
