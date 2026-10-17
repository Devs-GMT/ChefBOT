"use client";

import { useRef } from "react";

import { Counter } from "./counter";
import { SectionTag } from "@/components/ui/section-tag";

import { gsap, TOUCH } from "./motion/gsap";
import { useLandingMotion } from "./motion/use-landing-motion";

interface Stat {
  /** Rendered as a count-up when numeric. */
  value?: number;
  /** Static text for values that are not plain numbers (e.g. 10/20/30). */
  text?: string;
  label: string;
}

/** Staggered heights so the three blocks read as a bar chart (realfood.gov). */
const BAR_HEIGHTS = [
  "min-h-[180px] sm:min-h-[340px] lg:min-h-[400px]",
  "min-h-[180px] sm:min-h-[280px] lg:min-h-[320px]",
  "min-h-[180px] sm:min-h-[420px] lg:min-h-[520px]",
];

const STATS: Stat[] = [
  {
    value: 3,
    label: "Recipes in every result — never four, never a wall of text",
  },
  {
    text: "10/20/30",
    label: "Minute cook-time filters, plus a vegetarian switch",
  },
  {
    value: 677,
    label: "BOT Chain network id, where every stamp is recorded",
  },
];

/**
 * DESIGN.md "Statistics Data Block": Alert Red bars that grow out of the
 * baseline as you scroll (scrubbed, each bar on its own range so they rise
 * like a chart), with the numbers and captions rising inside them.
 */
export function LandingStats() {
  const scope = useRef<HTMLElement>(null);

  useLandingMotion(scope, () => {
    // Trigger off the <dl>, never the bars themselves: ScrollTrigger measures
    // a trigger in its start state, and a bar scaled to 4% would read as
    // sitting near its own bottom edge (firing far too late).
    const chart = scope.current!.querySelector("[data-chart]");
    const bars = gsap.utils.toArray<HTMLElement>("[data-bar]", scope.current);
    // Touch: grow once on enter (no per-frame scroll work); desktop scrubs.
    const touch = window.matchMedia(TOUCH).matches;
    bars.forEach((bar, index) => {
      gsap.fromTo(
        bar,
        { scaleY: 0.04, transformOrigin: "50% 100%" },
        touch
          ? {
              scaleY: 1,
              duration: 1.1,
              delay: index * 0.12,
              ease: "expo.out",
              scrollTrigger: { trigger: chart, start: "top 85%", once: true },
            }
          : {
              scaleY: 1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: chart,
                start: `top ${92 - index * 4}%`,
                end: `top ${48 - index * 4}%`,
                scrub: 0.6,
              },
            },
      );
      gsap.from(bar.querySelectorAll("[data-bar-text]"), {
        y: 36,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.1,
        delay: 0.35 + index * 0.1,
        ease: "expo.out",
        scrollTrigger: { trigger: chart, start: "top 70%", once: true },
      });
    });
    gsap.from("[data-baseline]", {
      scaleX: 0,
      transformOrigin: "left center",
      ease: touch ? "expo.out" : "none",
      duration: touch ? 1.2 : undefined,
      scrollTrigger: touch
        ? { trigger: "[data-baseline]", start: "top 95%", once: true }
        : { trigger: "[data-baseline]", start: "top 98%", end: "top 70%", scrub: true },
    });
  });

  return (
    <section ref={scope} id="numbers" aria-labelledby="numbers-heading" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <div data-anim="fade-up">
          <SectionTag>Kitchen facts</SectionTag>
        </div>
        <h2
          id="numbers-heading"
          data-anim="words"
          className="mt-6 max-w-4xl text-[clamp(2.5rem,6vw,96px)] leading-[0.96] font-bold tracking-[-0.03em] text-ink"
        >
          Cooking, by the numbers
        </h2>

        <dl data-chart className="mt-16 grid gap-4 sm:grid-cols-3 sm:items-end lg:mt-20 lg:gap-6">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              data-bar
              className={`flex flex-col justify-between rounded-t-2xl bg-alert p-6 will-change-transform ${BAR_HEIGHTS[index] ?? ""}`}
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <p
                  data-bar-text
                  className={`leading-[0.84] font-bold text-white tabular-nums ${
                    stat.value !== undefined
                      ? "text-[clamp(3.5rem,9.7vw,155px)] tracking-[-0.03em]"
                      : "text-[clamp(2.25rem,4.2vw,64px)] tracking-[-0.03em]"
                  }`}
                >
                  {stat.value !== undefined ? (
                    <Counter value={stat.value} suffixClassName="text-white" />
                  ) : (
                    <span>{stat.text}</span>
                  )}
                </p>
                <p
                  data-bar-text
                  className="mt-4 max-w-[16rem] text-base leading-[1.3] font-medium tracking-[-0.02em] text-white"
                >
                  {stat.label}
                </p>
              </dd>
            </div>
          ))}
        </dl>

        <div data-baseline aria-hidden="true" className="h-0.5 bg-ink" />
        <p className="mt-4 font-mono text-[12px] leading-[1.5] tracking-[0.06em] text-brick uppercase">
          Source: ChefBOT app rules ·{" "}
          <span className="text-alert">BOT Chain network config</span>
        </p>
      </div>
    </section>
  );
}
