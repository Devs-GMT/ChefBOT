"use client";

import { useId, useState } from "react";

import { CookButton } from "@/components/cook-button";
import type { Recipe } from "@/shared/recipe-schema";

export interface RecipeCardProps {
  recipe: Recipe;
  index: number;
}

export function RecipeCard({ recipe, index }: RecipeCardProps) {
  const [open, setOpen] = useState(false);
  const stepsId = useId();

  return (
    <article className="flex flex-col rounded-2xl border border-fog bg-paper p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p aria-hidden className="font-mono text-xs text-ink">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1 text-xl leading-snug font-semibold tracking-[-0.019em] text-ink">
            {recipe.emoji} {recipe.title}
          </h3>
        </div>
        <p className="shrink-0 pt-5 text-sm text-brick">{recipe.minutes} min</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {recipe.uses.map((use) => (
          <span
            key={use}
            className="rounded-full bg-wheat px-2 py-1 text-xs text-ink"
          >
            {use}
          </span>
        ))}
      </div>

      {recipe.missing.length > 0 && (
        <p className="mt-3 text-sm text-alert">
          Missing: {recipe.missing.join(", ")}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={stepsId}
        className="mt-5 flex min-h-11 w-full items-center justify-between rounded border border-fog px-3 text-sm font-medium text-ink transition-colors hover:border-ink/40"
      >
        {open ? "Hide steps" : `Show steps (${recipe.steps.length})`}
        <span aria-hidden className="font-mono">
          {open ? "–" : "+"}
        </span>
      </button>

      {open && (
        <ol
          id={stepsId}
          className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-brick"
        >
          {recipe.steps.map((step, stepIndex) => (
            <li key={stepIndex}>{step}</li>
          ))}
        </ol>
      )}

      <div className="mt-auto border-t border-fog pt-4">
        <CookButton recipe={recipe} />
      </div>
    </article>
  );
}
