"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { SectionTag } from "@/components/ui/section-tag";
import { INGREDIENT_GROUPS, type IngredientCategory } from "@/lib/ingredients";
import greens from "@/public/food/greens.jpg";
import pantry from "@/public/food/pantry-flatlay.jpg";
import poke from "@/public/food/poke-bowl.jpg";
import ramen from "@/public/food/ramen.jpg";

import { Magnetic } from "./motion/magnetic";
import { gsap, SplitText, TOUCH } from "./motion/gsap";
import { useLandingMotion } from "./motion/use-landing-motion";

const PHOTO: Record<IngredientCategory, StaticImageData> = {
  protein: poke,
  vegetables: greens,
  grains: ramen,
  pantry,
};

/** Inverted pyramid: widest tier on top (realfood.gov "Eat Real Food"). */
const WIDTH = ["lg:w-full", "lg:w-[88%]", "lg:w-[76%]", "lg:w-[64%]"];

/**
 * The food groups ChefBOT understands, straight from the ingredient
 * vocabulary. Opens with a statement whose letters light from stone to ink
 * as you scroll (pinned briefly on desktop so the moment lands), then the
 * pyramid tiers sweep in from alternating sides with their photos spinning
 * into place.
 */
export function LandingFoodGroups() {
  const scope = useRef<HTMLElement>(null);

  useLandingMotion(scope, ({ desktop }) => {
    const root = scope.current!;
    const statement = root.querySelector<HTMLElement>("[data-statement]")!;
    const touch = window.matchMedia(TOUCH).matches;
    if (touch) {
      // Phones: words rise once on enter — no per-frame colour repaints.
      const words = SplitText.create(statement, { type: "words", mask: "words" }).words;
      gsap.from(words, {
        yPercent: 110,
        duration: 1,
        stagger: 0.07,
        ease: "expo.out",
        scrollTrigger: { trigger: statement, start: "top 80%", once: true },
      });
    } else {
      const split = SplitText.create(statement, { type: "words,chars" });
      gsap.fromTo(
        split.chars,
        { color: "#d2d0c6", yPercent: 18 },
        {
          color: "#110000",
          yPercent: 0,
          stagger: 0.04,
          ease: "none",
          scrollTrigger: desktop
            ? { trigger: statement.parentElement, start: "center center", end: "+=90%", scrub: 0.5, pin: true }
            : { trigger: statement, start: "top 85%", end: "bottom 45%", scrub: 0.5 },
        },
      );
    }

    gsap.utils.toArray<HTMLElement>("[data-tier]", root).forEach((tier, index) => {
      const fromLeft = index % 2 === 0;
      const play = touch
        ? { duration: 0.9, scrollTrigger: { trigger: tier, start: "top 88%", once: true } }
        : { scrollTrigger: { trigger: tier, start: "top 98%", end: "top 62%", scrub: 0.7 } };
      gsap.fromTo(
        tier,
        { xPercent: fromLeft ? -18 : 18, rotate: fromLeft ? -2.5 : 2.5, autoAlpha: 0 },
        { xPercent: 0, rotate: 0, autoAlpha: 1, ease: "power3.out", ...play },
      );
      gsap.fromTo(
        tier.querySelector("[data-tier-photo]"),
        { rotate: fromLeft ? -120 : 120, scale: 0.4 },
        { rotate: 0, scale: 1, ease: "back.out(1.4)", ...play },
      );
    });
  });

  return (
    <section
      ref={scope}
      id="fridge"
      aria-labelledby="fridge-heading"
      // Tiers start shifted sideways before they sweep in — clip them so the
      // page never gets a horizontal scroll (clip, not hidden: no scroll box).
      className="scroll-mt-24 overflow-x-clip border-t border-fog"
    >
      <div className="flex min-h-[70svh] items-center justify-center px-4 py-24 text-center sm:px-6 lg:min-h-screen lg:py-0">
        <p
          data-statement
          className="mx-auto max-w-5xl text-[clamp(2.75rem,9vw,128px)] leading-[0.88] font-bold tracking-[-0.045em] text-ink"
        >
          Real food can be this easy.
        </p>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:pb-32">
        <div className="text-center">
          <div data-anim="fade-up">
            <SectionTag>Your fridge, sorted</SectionTag>
          </div>
          <h2
            id="fridge-heading"
            data-anim="lines"
            className="mx-auto mt-6 max-w-3xl text-[clamp(2.25rem,5.5vw,80px)] leading-[0.94] font-bold tracking-[-0.035em] text-ink"
          >
            Four food groups. Tap what you have.
          </h2>
        </div>

        <ol className="mt-14 flex flex-col items-center gap-3 lg:mt-20">
          {INGREDIENT_GROUPS.map((group, index) => {
            const dark = index % 2 === 0;
            return (
              <li key={group.id} data-tier className={`w-full ${WIDTH[index] ?? ""}`}>
                <div
                  className={`group flex flex-col gap-4 rounded-[28px] p-3 transition-transform duration-500 hover:scale-[1.01] sm:flex-row sm:items-center sm:gap-6 sm:rounded-full sm:pr-8 ${
                    dark ? "band-dark bg-ink text-parchment" : "bg-wheat text-ink"
                  }`}
                >
                  <div
                    data-tier-photo
                    className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-[22px] sm:aspect-square sm:w-24 sm:rounded-full lg:w-28"
                  >
                    <Image
                      src={PHOTO[group.id]}
                      alt=""
                      placeholder="blur"
                      sizes="(min-width: 640px) 112px, 100vw"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1 px-2 pb-2 text-left sm:px-0 sm:pb-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-[clamp(1.5rem,3vw,36px)] leading-[1] font-bold tracking-[-0.03em]">
                        {group.title}
                      </h3>
                      <span
                        className={`shrink-0 font-mono text-xs tracking-[0.06em] uppercase tabular-nums ${
                          dark ? "text-parchment/60" : "text-brick"
                        }`}
                      >
                        {group.ingredients.length} items
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-[15px] leading-[1.35] ${
                        dark ? "text-parchment/75" : "text-ink/75"
                      }`}
                    >
                      {group.ingredients.map((i) => i.label).join(" · ")}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div data-anim="fade-up" className="mt-12 flex justify-center">
          <Magnetic>
            <Link
              href="/app#cook"
              className="inline-flex min-h-14 items-center gap-3 rounded-full bg-ink py-2 pr-6 pl-2 text-base font-medium text-parchment transition-colors hover:bg-ink/85"
            >
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full bg-white text-ink"
              >
                →
              </span>
              Open your fridge
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
