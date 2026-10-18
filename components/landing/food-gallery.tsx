import Image from "next/image";
import type { CSSProperties } from "react";

import { SectionTag } from "@/components/ui/section-tag";
import { INGREDIENT_GROUPS, type IngredientCategory } from "@/lib/ingredients";

import { FoodGalleryMotion } from "./food-gallery-motion";

/** Painted cut-outs in public/food-art (scripts/build-food-art.mjs), with their viewBox size. */
export const FOOD_ART = {
  apple: { w: 400, h: 400 },
  banana: { w: 460, h: 360 },
  bread: { w: 460, h: 360 },
  broccoli: { w: 420, h: 440 },
  carrot: { w: 300, h: 460 },
  cheese: { w: 400, h: 400 },
  chili: { w: 420, h: 300 },
  drumstick: { w: 400, h: 400 },
  eggs: { w: 400, h: 400 },
  garlic: { w: 400, h: 400 },
  honey: { w: 340, h: 420 },
  milk: { w: 300, h: 460 },
  noodles: { w: 420, h: 380 },
  oats: { w: 360, h: 360 },
  peas: { w: 340, h: 440 },
  rice: { w: 420, h: 360 },
  salmon: { w: 440, h: 300 },
  soy: { w: 260, h: 460 },
  tofu: { w: 400, h: 400 },
  tomato: { w: 400, h: 400 },
} as const;

type ArtName = keyof typeof FOOD_ART;

/** One illustration in a collage: position/width in % of the collage box. */
interface Placement {
  art: ArtName;
  x: number;
  y: number;
  w: number;
  rotate: number;
  /** 0.3 (far, moves little) … 1 (near, moves most) — drives parallax + stacking. */
  depth: number;
}

interface Chapter {
  group: IngredientCategory;
  copy: string;
  items: Placement[];
}

/**
 * realfood.gov-style food-group chapters: copy on one side, a painted
 * collage on the other that bleeds off the edge. Order follows the pyramid.
 */
export const GALLERY_CHAPTERS: Chapter[] = [
  {
    group: "protein",
    copy: "Eggs, chicken, fish, tofu, butter and cheese — the anchor of a real plate. Tell ChefBOT what's in the fridge and it builds the meal around them.",
    items: [
      { art: "drumstick", x: 22, y: -6, w: 54, rotate: -8, depth: 0.5 },
      { art: "milk", x: 72, y: -4, w: 30, rotate: 6, depth: 0.85 },
      { art: "tofu", x: -6, y: 10, w: 30, rotate: -4, depth: 0.3 },
      { art: "cheese", x: -2, y: 40, w: 52, rotate: -6, depth: 0.7 },
      { art: "eggs", x: 42, y: 44, w: 40, rotate: 5, depth: 1 },
      { art: "salmon", x: 62, y: 58, w: 54, rotate: -5, depth: 0.45 },
    ],
  },
  {
    group: "vegetables",
    copy: "Whatever is in the crisper drawer counts. Colour is the point — ChefBOT folds it into dinner instead of leaving it to wilt.",
    items: [
      { art: "broccoli", x: 46, y: -10, w: 52, rotate: 4, depth: 0.5 },
      { art: "peas", x: 20, y: -2, w: 32, rotate: -6, depth: 0.85 },
      { art: "carrot", x: 90, y: 2, w: 20, rotate: 18, depth: 0.35 },
      { art: "banana", x: -8, y: 38, w: 60, rotate: -10, depth: 0.75 },
      { art: "tomato", x: 38, y: 48, w: 38, rotate: 0, depth: 1 },
      { art: "apple", x: 68, y: 46, w: 36, rotate: 8, depth: 0.6 },
    ],
  },
  {
    group: "grains",
    copy: "Rice, noodles, bread, a tortilla or two — the base that turns a handful of ingredients into a meal that fills you up.",
    items: [
      { art: "bread", x: 38, y: -6, w: 70, rotate: -4, depth: 0.5 },
      { art: "oats", x: -6, y: 18, w: 40, rotate: 0, depth: 0.3 },
      { art: "rice", x: 14, y: 42, w: 56, rotate: 3, depth: 0.9 },
      { art: "noodles", x: 60, y: 48, w: 50, rotate: -3, depth: 0.65 },
    ],
  },
  {
    group: "pantry",
    copy: "Garlic, chili, soy sauce, honey — the small jars that do the heavy lifting. ChefBOT knows which ones turn leftovers into a plan.",
    items: [
      { art: "soy", x: 72, y: -6, w: 24, rotate: 6, depth: 0.5 },
      { art: "honey", x: 40, y: 4, w: 36, rotate: -4, depth: 0.8 },
      { art: "garlic", x: -2, y: 32, w: 40, rotate: -6, depth: 0.9 },
      { art: "chili", x: 30, y: 60, w: 58, rotate: -12, depth: 1 },
    ],
  },
];

const GROUPS = new Map(INGREDIENT_GROUPS.map((group) => [group.id, group]));

/**
 * "The pantry, painted": one chapter per food group with hand-painted food
 * cut-outs. Motion lives in food-gallery-motion.tsx; on desktop the items
 * also breathe with a slow CSS float (globals.css `.art-float`).
 */
export function LandingFoodGallery() {
  return (
    <section
      id="pantry"
      aria-labelledby="pantry-heading"
      // Collages bleed past the edge on purpose; clip (not hidden) so the
      // page never scrolls sideways and no scroll container is created.
      className="overflow-x-clip border-t border-fog"
    >
      {/* Server-rendered markup (nothing to hydrate); only the motion is client JS. */}
      <FoodGalleryMotion />
      <div className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6 lg:pt-28">
        <div data-anim="fade-up">
          <SectionTag>The pantry, painted</SectionTag>
        </div>
        <h2
          id="pantry-heading"
          data-anim="lines"
          className="mt-6 max-w-4xl text-[clamp(2.5rem,7vw,104px)] leading-[0.9] font-bold tracking-[-0.045em] text-ink"
        >
          Everything starts in your kitchen.
        </h2>
      </div>

      {GALLERY_CHAPTERS.map((chapter, index) => {
        const group = GROUPS.get(chapter.group)!;
        const flip = index % 2 === 1;
        const headingId = `pantry-${chapter.group}`;
        return (
          <section
            key={chapter.group}
            data-chapter
            aria-labelledby={headingId}
            className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-6 lg:py-24"
          >
            <div className={`lg:sticky lg:top-28 lg:col-span-5 ${flip ? "lg:order-2 lg:col-start-8" : ""}`}>
              <h3
                id={headingId}
                data-anim="lines"
                className="text-[clamp(2.25rem,5vw,72px)] leading-[0.92] font-bold tracking-[-0.04em] text-ink"
              >
                {group.title}
              </h3>
              <p data-anim="fade-up" className="mt-6 max-w-md text-[19px] leading-[1.35] tracking-[-0.02em] text-ink/85">
                {chapter.copy}
              </p>
              <p data-anim="fade-up" className="mt-5 text-[19px] leading-[1.35] tracking-[-0.02em] text-ink">
                <strong className="font-bold">ChefBOT knows:</strong> {group.ingredients.length} items
              </p>
              <ul data-anim="fade-up" className="mt-5 flex flex-wrap gap-1.5" aria-label={`Some ${group.title.toLowerCase()}`}>
                {group.ingredients.slice(0, 6).map((ingredient) => (
                  <li key={ingredient.id} className="rounded-full border border-fog bg-paper px-3 py-1 text-xs text-ink">
                    {ingredient.label}
                  </li>
                ))}
              </ul>
            </div>

            <div
              aria-hidden="true"
              className={`relative aspect-square w-full lg:col-span-7 lg:aspect-[4/3.6] ${
                flip ? "lg:order-1 lg:-ml-[12%] lg:w-[112%]" : "lg:-mr-[12%] lg:w-[112%]"
              }`}
            >
              {chapter.items.map((item) => {
                const art = FOOD_ART[item.art];
                return (
                  <div
                    key={item.art}
                    data-art
                    data-depth={item.depth}
                    data-rotate={item.rotate}
                    className="absolute will-change-transform"
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.w}%`,
                      zIndex: Math.round(item.depth * 10),
                    }}
                  >
                    <div data-art-drop style={{ transform: `rotate(${item.rotate}deg)` }}>
                      <div
                        className="art-float"
                        style={{ animationDelay: `${-item.depth * 5}s` } as CSSProperties}
                      >
                        <Image
                          src={`/food-art/${item.art}.svg`}
                          alt=""
                          width={art.w}
                          height={art.h}
                          unoptimized
                          className="h-auto w-full select-none"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
