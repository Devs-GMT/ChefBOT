"use client";

import Image from "next/image";
import { useRef } from "react";

import { SectionTag } from "@/components/ui/section-tag";
import prep from "@/public/food/prep.jpg";
import salmon from "@/public/food/salmon-plate.jpg";

import { EASE_OUT, gsap, TOUCH } from "./motion/gsap";
import { useLandingMotion } from "./motion/use-landing-motion";

const FEATURES = [
  {
    title: "Recipes that respect the clock",
    body: "10, 20, or 30 minutes in, three complete recipes out — each with steps short enough to actually follow while the pan heats.",
  },
  {
    title: "AI with a real fallback",
    body: "If the AI worker takes longer than 8 seconds or hiccups, curated House favourites from the local cookbook serve you instead. The flow never dead-ends.",
  },
  {
    title: "Pantry gaps, shown early",
    body: "Before you start chopping, missing ingredients are flagged in red on every card. No surprise runs to the store mid-recipe.",
  },
  {
    title: "Your ledger, on-chain",
    body: "Every \"I cooked it\" stamp is a transaction on BOT Chain — one per wallet per dish, so the Most Cooked board can't be spammed.",
  },
];

/**
 * Photo-led editorial list: a sticky photo column beside numbered items
 * separated by hairlines (realfood.gov "America Returns to Real Food").
 */
export function LandingFeatures() {
  const scope = useRef<HTMLElement>(null);

  useLandingMotion(scope, () => {
    const root = scope.current!;
    const list = root.querySelector("[data-feature-list]");
    // Photo: zooms out to rest while the list scrolls past; the inset drifts.
    // Desktop only — on phones these scrubs cost frames for little effect.
    if (!window.matchMedia(TOUCH).matches) {
      gsap.fromTo(
        root.querySelector("[data-feature-photo]"),
        { scale: 1.25 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 85%", end: "bottom 60%", scrub: true } },
      );
      gsap.fromTo(
        root.querySelector("[data-feature-inset]"),
        { yPercent: 40, rotate: -6 },
        { yPercent: -30, rotate: 3, ease: "none", scrollTrigger: { trigger: list, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }
    gsap.utils.toArray<HTMLElement>("[data-feature]", root).forEach((item) => {
      const tl = gsap.timeline({
        defaults: { ease: EASE_OUT },
        scrollTrigger: { trigger: item, start: "top 85%", once: true },
      });
      tl.from(item.querySelector("[data-feature-rule]"), { scaleX: 0, transformOrigin: "left center", duration: 1.1 })
        .from(item.querySelector("[data-feature-number]"), { yPercent: 100, autoAlpha: 0, rotate: -12, duration: 0.8 }, 0.1)
        .from(item.querySelectorAll("[data-feature-copy] > *"), { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.15);
    });
  });

  return (
    <section ref={scope} id="features" aria-labelledby="features-heading" className="border-t border-fog">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <div data-anim="fade-up">
          <SectionTag>Why ChefBOT</SectionTag>
        </div>
          <h2
            id="features-heading"
            data-anim="lines"
            className="mt-6 max-w-4xl text-[clamp(2.5rem,6vw,96px)] leading-[0.92] font-bold tracking-[-0.04em] text-ink"
          >
            Built for people who are already hungry
          </h2>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div data-anim="fade-up" className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-wheat">
                <Image
                  data-feature-photo
                  src={salmon}
                  alt="Glazed salmon with rice, green beans and cherry tomatoes on a pink plate."
                  placeholder="blur"
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <div data-feature-inset className="absolute -bottom-6 -left-2 w-[42%] overflow-hidden rounded-2xl border-4 border-parchment shadow-card sm:-left-6">
                <Image
                  src={prep}
                  alt=""
                  placeholder="blur"
                  sizes="220px"
                  className="aspect-square h-full w-full object-cover"
                />
              </div>
              <p className="absolute top-4 right-4 rounded-full bg-parchment/90 px-3 py-1.5 font-mono text-[11px] tracking-[0.06em] text-ink uppercase backdrop-blur">
                20 min · uses 4 of yours
              </p>
            </div>
          </div>

          <ol data-feature-list className="border-t-2 border-ink">
            {FEATURES.map((feature, index) => (
              <li
                key={feature.title}
                data-feature
                className="relative grid grid-cols-[3rem_1fr] gap-4 overflow-hidden py-8 sm:grid-cols-[4.5rem_1fr] lg:py-10"
              >
                <span
                  data-feature-rule
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-px bg-fog"
                />
                <span
                  data-feature-number
                  aria-hidden="true"
                  className="text-[clamp(1.75rem,3vw,40px)] leading-[0.9] font-bold tracking-[-0.03em] text-alert tabular-nums"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div data-feature-copy>
                  <h3 className="text-[clamp(1.5rem,2.6vw,33px)] leading-[1.04] font-bold tracking-[-0.025em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-base leading-[1.45] tracking-[-0.02em] text-brick sm:text-[17px]">
                    {feature.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
