"use client";

import { useEffect, useRef, useState } from "react";

import { FridgeScan } from "@/components/kitchen/fridge-scan";
import { IngredientPicker, ingredientEmoji } from "@/components/kitchen/ingredient-picker";
import { RecipeCard, RecipeCardSkeleton } from "@/components/kitchen/recipe-card";
import { SectionTag } from "@/components/ui/section-tag";
import { INGREDIENT_GROUPS } from "@/lib/ingredients";
import { readCookSession, saveCookSession } from "@/lib/cook-session";
import { getRecipes, type RecipeResult } from "@/lib/recipes";
import { MAX_INGREDIENTS, MAX_VARIATION, type RecipeRequest } from "@/shared/recipe-schema";

const TIME_OPTIONS = [10, 20, 30] as const;
/** Titles remembered for "New ideas" (about nine rounds). */
const MAX_SEEN = 27;

const LABELS = new Map(
  INGREDIENT_GROUPS.flatMap((group) => group.ingredients).map((i) => [
    i.id,
    i.label,
  ]),
);

export function CookFlow() {
  // Coming back from another kitchen page restores the last picks and recipes.
  const [restored] = useState(readCookSession);
  const [selected, setSelected] = useState<string[]>(restored.selected);
  const [maxMinutes, setMaxMinutes] = useState<number>(restored.maxMinutes);
  const [vegetarian, setVegetarian] = useState(restored.vegetarian);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">(restored.result ? "done" : "idle");
  const [result, setResult] = useState<RecipeResult | null>(restored.result);
  const resultsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef({ ...restored.history, seen: [...restored.history.seen] });
  const skipScrollRef = useRef(restored.result !== null);

  const canSubmit = selected.length >= 2 && phase !== "loading";

  // Bring the answer into view once it lands (an external DOM effect), but
  // not when the page opens with restored results.
  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    if (phase === "loading" || phase === "done") {
      resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
  }, [phase]);

  useEffect(() => {
    saveCookSession({ selected, maxMinutes, vegetarian });
  }, [selected, maxMinutes, vegetarian]);

  function toggleIngredient(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  /** Scan results join the picks (never replace them), up to the cap. */
  function addIngredients(ids: string[]) {
    setSelected((current) =>
      [...current, ...ids.filter((id) => !current.includes(id))].slice(0, MAX_INGREDIENTS),
    );
  }

  async function requestRecipes() {
    if (selected.length < 2 || phase === "loading") {
      return;
    }
    setPhase("loading");
    // Same picks again = "New ideas": ask for the next style and skip what
    // was already shown. Any change to the picks starts a fresh round.
    const key = `${[...selected].sort().join(",")}|${maxMinutes}|${vegetarian}`;
    const history = historyRef.current;
    if (history.key !== key) {
      historyRef.current = { key, round: 0, seen: [] };
    } else {
      history.round += 1;
    }
    const { round, seen } = historyRef.current;
    const request: RecipeRequest = { ingredients: selected, maxMinutes, vegetarian };
    const variation = round % (MAX_VARIATION + 1);
    if (variation > 0) request.variation = variation;
    const next = await getRecipes(request, { exclude: [...seen] });
    historyRef.current.seen = [...seen, ...next.recipes.map((r) => r.title)].slice(-MAX_SEEN);
    // Saved here too, so recipes that land after the cook left the page wait for them.
    saveCookSession({ result: next, history: { ...historyRef.current } });
    setResult(next);
    setPhase("done");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestRecipes();
  }

  const statusText =
    phase === "loading"
      ? "ChefBOT is tasting ideas…"
      : phase === "done"
        ? "Three recipes ready."
        : selected.length === 0
          ? "Nothing picked yet."
          : `${selected.length} ingredient${selected.length === 1 ? "" : "s"} picked.`;

  return (
    <section
      id="cook"
      aria-labelledby="cook-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-16"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTag>Step 01 · Your fridge</SectionTag>
          <h2
            id="cook-heading"
            className="mt-5 text-[clamp(2.25rem,6vw,72px)] leading-[0.92] font-bold tracking-[-0.03em] text-ink"
          >
            What&apos;s in your fridge?
          </h2>
        </div>
        <p className="max-w-sm text-base leading-[1.4] tracking-[-0.02em] text-brick">
          Tap what you have. ChefBOT returns three recipes that fit — pantry
          gaps flagged in red.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="rounded-[28px] border border-fog bg-paper p-4 shadow-card sm:p-8">
          <FridgeScan onDetected={addIngredients} />
          <IngredientPicker selected={selected} onToggle={toggleIngredient} />

          <div className="mt-8 grid gap-6 border-t border-fog pt-6 sm:grid-cols-2">
            <fieldset>
              <legend className="font-mono text-xs tracking-[0.06em] text-ink uppercase">
                Ready in
              </legend>
              <div className="mt-3 inline-flex rounded-full bg-wheat p-1">
                {TIME_OPTIONS.map((minutes) => (
                  <label
                    key={minutes}
                    className={`flex min-h-11 cursor-pointer items-center rounded-full px-5 text-[15px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${
                      maxMinutes === minutes
                        ? "bg-ink text-white"
                        : "text-ink hover:bg-stone/50"
                    }`}
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
                Vegetarian
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={vegetarian}
                aria-labelledby="vegetarian-label"
                onClick={() => setVegetarian((value) => !value)}
                className="mt-3 flex min-h-11 items-center gap-3 text-[15px] text-ink"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    vegetarian ? "bg-ink" : "bg-stone"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${
                      vegetarian ? "translate-x-5" : ""
                    }`}
                  />
                </span>
                {vegetarian ? "Plants only 🌱" : "Anything goes"}
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-3 z-30 mt-4 sm:bottom-5">
          <div className="band-dark flex flex-col gap-3 rounded-[28px] bg-ink p-3 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:pl-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-parchment/60 uppercase">
                Your fridge
                <span className="ml-1.5 text-parchment tabular-nums">
                  {selected.length}
                </span>
              </span>
              <ul
                aria-label="Picked ingredients"
                className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]"
              >
                {selected.length === 0 && (
                  <li className="text-sm whitespace-nowrap text-parchment/50">
                    Tap ingredients above
                  </li>
                )}
                {selected.map((id) => (
                  <li key={id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleIngredient(id)}
                      aria-label={`Remove ${LABELS.get(id) ?? id}`}
                      className="flex min-h-9 items-center gap-1.5 rounded-full bg-parchment/10 pr-2.5 pl-2 text-sm text-parchment transition-colors hover:bg-parchment/20"
                    >
                      <span aria-hidden="true">{ingredientEmoji(id)}</span>
                      {LABELS.get(id) ?? id}
                      <span aria-hidden="true" className="text-parchment/50">
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-3">
              <p
                id="cook-hint"
                className="flex-1 text-xs text-parchment/60 sm:max-w-36 sm:text-right"
              >
                {selected.length < 2
                  ? "Pick at least 2 ingredients to continue."
                  : "Three recipes, no signup."}
              </p>
              <button
                type="submit"
                disabled={!canSubmit}
                aria-describedby="cook-hint"
                className={`inline-flex min-h-12 shrink-0 items-center rounded-full px-6 text-[15px] font-medium transition-[background-color,transform] ${
                  canSubmit
                    ? "bg-parchment text-ink hover:bg-white active:scale-[0.98]"
                    : "cursor-not-allowed bg-parchment/15 text-parchment/45"
                }`}
              >
                {phase === "loading" ? "Tasting ideas…" : "Cook something →"}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div ref={resultsRef} className="scroll-mt-24">
        <p
          role="status"
          aria-live="polite"
          className={
            phase === "loading"
              ? "mt-10 flex items-center gap-3 text-[19px] font-medium tracking-[-0.019em] text-ink"
              : "sr-only"
          }
        >
          {phase === "loading" && (
            <span aria-hidden="true" className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-2 animate-bounce rounded-full bg-alert"
                  style={{ animationDelay: `${dot * 120}ms` }}
                />
              ))}
            </span>
          )}
          {statusText}
        </p>

        {phase === "loading" && (
          <div
            aria-busy="true"
            aria-label="Loading recipes"
            className="mt-6 space-y-4"
          >
            {[0, 1, 2].map((row) => (
              <RecipeCardSkeleton key={row} />
            ))}
          </div>
        )}

        {phase === "done" && result && (
          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[clamp(1.75rem,4vw,44px)] leading-[1] font-bold tracking-[-0.03em] text-ink">
                  Tonight&apos;s picks
                </h3>
                {result.source === "fallback" ? (
                  <span className="rounded-full bg-wheat px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] text-ink uppercase">
                    House favourites — curated picks
                  </span>
                ) : (
                  <span className="rounded-full bg-wheat px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] text-ink uppercase">
                    Fresh from ChefBOT AI
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void requestRecipes()}
                className="min-h-11 rounded-full border-[1.5px] border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-white"
              >
                New ideas ↻
              </button>
            </div>
            <div className="mt-6 space-y-4">
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
      </div>
    </section>
  );
}
