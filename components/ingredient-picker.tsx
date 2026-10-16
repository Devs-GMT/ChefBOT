"use client";

import { INGREDIENT_GROUPS } from "@/lib/ingredients";

export interface IngredientPickerProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function IngredientPicker({ selected, onToggle }: IngredientPickerProps) {
  const selectedSet = new Set(selected);

  return (
    <div className="space-y-8">
      {INGREDIENT_GROUPS.map((group) => (
        <fieldset key={group.id}>
          <legend className="font-mono text-xs tracking-[0.06em] text-ink uppercase">
            {group.title}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.ingredients.map((ingredient) => {
              const isSelected = selectedSet.has(ingredient.id);
              return (
                <button
                  key={ingredient.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(ingredient.id)}
                  className={
                    isSelected
                      ? "min-h-11 rounded-full bg-ink px-4 text-sm font-medium text-white transition-colors"
                      : "min-h-11 rounded-full border border-fog px-4 text-sm text-ink/85 transition-colors hover:border-ink/40 hover:text-ink"
                  }
                >
                  {ingredient.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
