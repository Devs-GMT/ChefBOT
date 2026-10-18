import Link from "next/link";

import { ingredientEmoji } from "@/components/kitchen/ingredient-picker";
import { ALL_INGREDIENT_IDS, INGREDIENT_GROUPS } from "@/lib/ingredients";

/**
 * Every ingredient ChefBOT understands as a dense tile grid — the
 * realfood.gov idea of a packed photo grid under each pyramid tier, told
 * with the kitchen's own emoji. Surfaces alternate ink / wheat per group to
 * echo the tiers above. Each tile opens the kitchen.
 */
export function IngredientMosaic() {
  return (
    <div className="mt-16 lg:mt-24">
      <p className="text-center font-mono text-xs tracking-[0.06em] text-brick uppercase tabular-nums">
        {ALL_INGREDIENT_IDS.length} ingredients
      </p>
      <div className="mt-6 space-y-8">
        {INGREDIENT_GROUPS.map((group, index) => {
          const dark = index % 2 === 0;
          return (
            <div key={group.id} data-anim="fade-up">
              <p className="mb-3 font-mono text-[12px] tracking-[0.06em] text-ink uppercase">
                {group.title}
              </p>
              <ul
                aria-label={group.title}
                className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10"
              >
                {group.ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    <Link
                      href="/app#cook"
                      className={`group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl p-2 text-center transition-transform duration-300 hover:-translate-y-1 ${
                        dark ? "band-dark bg-ink text-parchment" : "bg-wheat text-ink"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="text-[clamp(1.5rem,6vw,2.25rem)] leading-none transition-transform duration-300 group-hover:scale-110"
                      >
                        {ingredientEmoji(ingredient.id)}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-tight font-medium sm:text-xs">
                        {ingredient.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
