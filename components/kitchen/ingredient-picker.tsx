"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

import { INGREDIENT_GROUPS } from "@/lib/ingredients";

export interface IngredientPickerProps {
  selected: string[];
  onToggle: (id: string) => void;
}

/** Decorative chip glyphs — the accessible name stays the plain label. */
const EMOJI: Record<string, string> = {
  egg: "🥚",
  "chicken breast": "🍗",
  "ground beef": "🥩",
  bacon: "🥓",
  tofu: "🧊",
  salmon: "🐟",
  shrimp: "🍤",
  butter: "🧈",
  cheese: "🧀",
  yogurt: "🥛",
  tomato: "🍅",
  onion: "🧅",
  garlic: "🧄",
  carrot: "🥕",
  spinach: "🥬",
  broccoli: "🥦",
  "bell pepper": "🫑",
  mushroom: "🍄",
  potato: "🥔",
  avocado: "🥑",
  lemon: "🍋",
  banana: "🍌",
  apple: "🍎",
  cucumber: "🥒",
  corn: "🌽",
  rice: "🍚",
  pasta: "🍝",
  bread: "🍞",
  noodle: "🍜",
  tortilla: "🫓",
  oats: "🥣",
  flour: "🌾",
  "soy sauce": "🥢",
  "olive oil": "🫒",
  "peanut butter": "🥜",
  "coconut milk": "🥥",
  "canned beans": "🫘",
  "hot sauce": "🌶️",
  honey: "🍯",
  vinegar: "🍶",
  sugar: "🍬",
  "curry paste": "🍛",
  "chicken thigh": "🍗",
  beef: "🥩",
  sausage: "🌭",
  tempeh: "🟫",
  "fish fillet": "🐠",
  milk: "🥛",
  cabbage: "🥬",
  cauliflower: "🥦",
  eggplant: "🍆",
  "green beans": "🫛",
  "long beans": "🫛",
  "bok choy": "🥬",
  peas: "🫛",
  lime: "🍋",
  ginger: "🫚",
  shallot: "🧅",
  "rice vermicelli": "🍜",
  "oyster sauce": "🦪",
  "spring onion": "🌱",
  chili: "🌶️",
};

const BLURB: Record<string, string> = {
  protein: "Eggs, meat, fish, tofu and the fats that make them sing.",
  vegetables: "Whatever is in the crisper drawer — color counts.",
  grains: "The base: rice, noodles, bread, a tortilla or two.",
  pantry: "Sauces and staples that turn ingredients into dinner.",
};

/**
 * Food-group tabs (WAI-ARIA tabs pattern: roving tabindex, arrow/Home/End
 * keys) over big tap-to-select chips. Each tab shows how many of its
 * ingredients are picked so selections in hidden panels stay visible.
 */
export function IngredientPicker({ selected, onToggle }: IngredientPickerProps) {
  const selectedSet = new Set(selected);
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  function focusTab(index: number) {
    const count = INGREDIENT_GROUPS.length;
    const next = (index + count) % count;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(active - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(INGREDIENT_GROUPS.length - 1);
    }
  }

  const group = INGREDIENT_GROUPS[active] ?? INGREDIENT_GROUPS[0]!;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Food groups"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {INGREDIENT_GROUPS.map((item, index) => {
          const isActive = index === active;
          const picked = item.ingredients.filter((i) =>
            selectedSet.has(i.id),
          ).length;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`${baseId}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={handleKeyDown}
              className={`flex min-h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-ink text-white"
                  : "bg-wheat text-ink hover:bg-stone/60"
              }`}
            >
              {item.title}
              {picked > 0 && (
                <span
                  className={`flex size-6 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ${
                    isActive ? "bg-alert text-white" : "bg-ink text-white"
                  }`}
                >
                  {picked}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${group.id}`}
        className="mt-6"
      >
        <p className="text-[15px] leading-[1.4] tracking-[-0.02em] text-brick">
          {BLURB[group.id]}
        </p>
        <div
          key={group.id}
          className="chip-stagger mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        >
          {group.ingredients.map((ingredient, index) => {
            const isSelected = selectedSet.has(ingredient.id);
            return (
              <button
                key={ingredient.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(ingredient.id)}
                style={{ animationDelay: `${index * 25}ms` }}
                className={`group flex min-h-14 items-center gap-3 rounded-2xl border-[1.5px] px-3 text-left text-[15px] font-medium transition-[background-color,border-color,transform] active:scale-[0.97] ${
                  isSelected
                    ? "border-ink bg-ink text-white"
                    : "border-fog bg-paper text-ink hover:border-ink/40"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xl ${
                    isSelected ? "bg-white/10" : "bg-wheat"
                  }`}
                >
                  {EMOJI[ingredient.id] ?? "•"}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  {ingredient.label}
                </span>
                {/* Decorative tick; dropped on narrow phones so long names
                    ("Cauliflower") fit — the filled chip already shows state. */}
                <span
                  aria-hidden="true"
                  className={`hidden size-5 shrink-0 items-center justify-center rounded-full text-[11px] min-[400px]:flex ${
                    isSelected
                      ? "bg-alert text-white"
                      : "border border-ash text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Chip glyph for an ingredient id (shared with the selection tray). */
export function ingredientEmoji(id: string): string {
  return EMOJI[id] ?? "•";
}
