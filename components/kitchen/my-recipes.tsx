"use client";

import { useId, useState, type FormEvent } from "react";

import { RecipeCard } from "@/components/kitchen/recipe-card";
import { SectionTag } from "@/components/ui/section-tag";
import {
  MAX_MY_MINUTES,
  deleteMyRecipe,
  draftToRecipe,
  saveMyRecipe,
  useMyRecipes,
  type RecipeDraft,
} from "@/lib/my-recipes";
import type { Recipe } from "@/shared/recipe-schema";

const BLANK: RecipeDraft = { title: "", emoji: "", minutes: "20", ingredients: "", steps: "" };

const FIELD =
  "mt-1.5 w-full rounded-2xl border border-fog bg-paper px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-ink/50";
const LABEL = "block text-sm font-medium text-ink";
const PRIMARY =
  "inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-white";
const SECONDARY =
  "inline-flex min-h-11 items-center rounded-full border border-fog px-4 text-sm font-medium text-ink transition-colors hover:border-ink/40";
const DANGER =
  "inline-flex min-h-11 items-center rounded-full border border-fog px-4 text-sm font-medium text-alert transition-colors hover:border-alert/50";

function toDraft(recipe: Recipe): RecipeDraft {
  return {
    title: recipe.title,
    emoji: recipe.emoji,
    minutes: String(recipe.minutes),
    ingredients: recipe.uses.join(", "),
    steps: recipe.steps.join("\n"),
  };
}

/** v1.1: a cook's own recipes — private to this browser, stampable. */
export function MyRecipes() {
  const recipes = useMyRecipes();
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const formId = useId();

  function open(next: RecipeDraft, title?: string) {
    setDraft(next);
    setEditing(title);
    setError(null);
  }

  function close() {
    setDraft(null);
    setEditing(undefined);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const recipe = draftToRecipe(draft);
    if (!recipe.ok) {
      setError(recipe.reason);
      return;
    }
    const saved = saveMyRecipe(recipe.value, editing);
    if (!saved.ok) {
      setError(saved.reason);
      return;
    }
    close();
  }

  const field = (key: keyof RecipeDraft) => ({
    id: `${formId}-${key}`,
    value: draft?.[key] ?? "",
    onChange: (event: { target: { value: string } }) =>
      setDraft((current) => (current ? { ...current, [key]: event.target.value } : current)),
  });

  return (
    <section
      id="my-recipes"
      aria-labelledby="my-recipes-heading"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-16"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTag>Your cookbook</SectionTag>
          <h2
            id="my-recipes-heading"
            className="mt-5 text-[clamp(2.25rem,6vw,72px)] leading-[0.92] font-bold tracking-[-0.03em] text-ink"
          >
            My Recipes
          </h2>
        </div>
        <p className="max-w-sm text-base leading-[1.4] tracking-[-0.02em] text-brick">
          Saved only in this browser. Stamping one puts just its title and
          emoji on BOT Chain — your steps stay yours.
        </p>
      </div>

      <div className="mt-8 rounded-[28px] border border-fog bg-paper p-4 shadow-card sm:p-8">
        {draft ? (
          <form onSubmit={submit} noValidate aria-label={editing ? `Edit ${editing}` : "New recipe"}>
            <div className="grid gap-4 sm:grid-cols-[1fr_96px_120px]">
              <label className={LABEL} htmlFor={`${formId}-title`}>
                Title
                <input {...field("title")} className={FIELD} maxLength={80} autoComplete="off" />
              </label>
              <label className={LABEL} htmlFor={`${formId}-emoji`}>
                Emoji
                <input {...field("emoji")} className={FIELD} placeholder="🍳" maxLength={8} />
              </label>
              <label className={LABEL} htmlFor={`${formId}-minutes`}>
                Minutes
                <input
                  {...field("minutes")}
                  className={FIELD}
                  inputMode="numeric"
                  min={1}
                  max={MAX_MY_MINUTES}
                />
              </label>
            </div>
            <label className={`${LABEL} mt-4`} htmlFor={`${formId}-ingredients`}>
              Ingredients <span className="font-normal text-brick">(comma-separated)</span>
              <input {...field("ingredients")} className={FIELD} placeholder="egg, rice, chili" />
            </label>
            <label className={`${LABEL} mt-4`} htmlFor={`${formId}-steps`}>
              Steps <span className="font-normal text-brick">(one per line, up to 8)</span>
              <textarea {...field("steps")} className={`${FIELD} min-h-36`} rows={6} />
            </label>
            {error && (
              <p role="alert" className="mt-4 text-sm font-medium text-alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="submit" className={PRIMARY}>
                Save recipe
              </button>
              <button type="button" onClick={close} className={SECONDARY}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-brick">
              {recipes.length === 0 ? (
                <>
                  <span className="font-medium text-ink">No recipes of your own yet.</span>{" "}
                  Write down a family favourite and stamp it when you cook it.
                </>
              ) : (
                `${recipes.length} recipe${recipes.length === 1 ? "" : "s"} in your cookbook.`
              )}
            </p>
            <button type="button" onClick={() => open(BLANK)} className={PRIMARY}>
              Write a recipe
            </button>
          </div>
        )}
      </div>

      {recipes.length > 0 && (
        <div className="mt-6 space-y-4">
          {recipes.map((recipe, index) => (
            <RecipeCard
              key={recipe.title}
              recipe={recipe}
              index={index}
              total={recipes.length}
              archive={false}
              actions={
                <>
                  <button
                    type="button"
                    aria-label={`Edit ${recipe.title}`}
                    onClick={() => open(toDraft(recipe), recipe.title)}
                    className={SECONDARY}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${recipe.title}`}
                    onClick={() => {
                      if (editing === recipe.title) close();
                      deleteMyRecipe(recipe.title);
                    }}
                    className={DANGER}
                  >
                    Delete
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
