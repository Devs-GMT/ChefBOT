"use client";

import { useRef } from "react";

import { SectionTag } from "@/components/ui/section-tag";

import { EASE_OUT, gsap, TOUCH } from "../motion/gsap";
import { useLandingMotion } from "../motion/use-landing-motion";
import { STEP_TIMELINES } from "./step-timelines";
import { STEPS } from "./steps";

/** Scrubbed length of each illustration build (timeline seconds). */
const STEP_BUILD = 1.6;

/**
 * "How it works" scrollytelling.
 *
 * Desktop (≥1024px): the stage pins for three screens of scroll and one
 * scrubbed master timeline plays: each step's illustration builds itself
 * (strokes draw, door swings, cards fan, stamp slams), then the copy and
 * figure hand over to the next step. A rail fills and an odometer rolls
 * 01→03 alongside. Snaps settle on each step.
 *
 * Mobile/tablet: no pin — the steps stack and each illustration plays its
 * own timeline as it scrolls in. One DOM for both; steps share a grid cell
 * on desktop so they can cross-fade in place.
 */
export function LandingHow() {
  const scope = useRef<HTMLElement>(null);

  useLandingMotion(scope, ({ desktop }) => {
    const root = scope.current!;
    const steps = gsap.utils.toArray<HTMLElement>("[data-how-step]", root);
    const figures = steps.map((step) => step.querySelector<HTMLElement>("[data-step-figure]")!);
    const copies = steps.map((step) => step.querySelector<HTMLElement>("[data-step-copy]")!);

    if (!desktop) {
      // Phones: one cheap reveal per figure (transform/opacity on the whole
      // SVG). Tablets with a mouse still get the per-part choreography.
      const touch = window.matchMedia(TOUCH).matches;
      steps.forEach((step, index) => {
        const kind = STEPS[index]!.kind;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: step, start: "top 72%", toggleActions: "play none none none" },
        });
        tl.from(copies[index]!, { autoAlpha: 0, y: 40, duration: 0.8, ease: EASE_OUT });
        if (touch) {
          tl.from(
            figures[index]!,
            { autoAlpha: 0, scale: 0.9, rotate: index % 2 === 0 ? -4 : 4, duration: 0.9, ease: "back.out(1.6)" },
            0.1,
          );
        } else {
          tl.add(STEP_TIMELINES[kind](figures[index]!), 0.15);
        }
      });
      return;
    }

    const stage = root.querySelector<HTMLElement>("[data-how-stage]")!;
    const fill = root.querySelector("[data-rail-fill]");
    const odometer = root.querySelector("[data-odometer]");
    gsap.set(steps.slice(1), { autoAlpha: 0 });

    const master = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: stage,
        start: "top top",
        end: "+=320%",
        pin: true,
        scrub: 0.9,
        // Nearest step, not "next in scroll direction": a normal flick that
        // lands just past a step must settle on it, never skip ahead.
        snap: {
          snapTo: "labels",
          duration: { min: 0.25, max: 0.8 },
          delay: 0.12,
          ease: "power2.inOut",
        },
      },
    });

    // Rest points at both ends so entering/leaving the pin is never yanked.
    master.addLabel("start", 0);
    steps.forEach((step, index) => {
      const kind = STEPS[index]!.kind;
      if (index > 0) {
        const prev = index - 1;
        master
          .to(copies[prev]!, { yPercent: -30, autoAlpha: 0, duration: 0.5 })
          .to(figures[prev]!, { scale: 0.82, rotate: -6, autoAlpha: 0, duration: 0.5 }, "<")
          .set(steps[prev]!, { autoAlpha: 0 })
          .set(step, { autoAlpha: 1 })
          .fromTo(copies[index]!, { yPercent: 30, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5 }, "<")
          .to(odometer, { yPercent: (-100 / STEPS.length) * index, duration: 0.5 }, "<");
      }
      // Every step gets the same scroll distance, so snap points are evenly spaced.
      master.add(STEP_TIMELINES[kind](figures[index]!).duration(STEP_BUILD), index === 0 ? 0 : "-=0.2");
      master.addLabel(`step-${index + 1}`);
      // Hold so each finished illustration can be enjoyed before moving on.
      master.to({}, { duration: 0.6 });
    });

    master.addLabel("end");
    master.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none", duration: master.duration() }, 0);
  });

  return (
    <section
      ref={scope}
      id="how"
      aria-labelledby="how-heading"
      className="scroll-mt-24 border-t border-fog"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6 lg:pt-32">
        <div data-anim="fade-up">
          <SectionTag>Three steps, no signup</SectionTag>
        </div>
        <h2
          id="how-heading"
          data-anim="chars"
          className="mt-6 max-w-2xl text-[clamp(2.5rem,6vw,96px)] leading-[0.96] font-bold tracking-[-0.035em] text-ink"
        >
          How it works
        </h2>
      </div>

      <div data-how-stage className="how-stage relative">
        <div className="how-grid mx-auto h-full w-full max-w-6xl px-4 sm:px-6">
          {/* Progress rail + odometer (desktop) */}
          <div aria-hidden="true" className="how-rail h-[62vh] flex-col items-center gap-6">
            <div className="h-[0.9em] overflow-hidden text-[56px] leading-[0.9] font-bold tracking-[-0.04em] text-alert tabular-nums">
              <div data-odometer>
                {STEPS.map((step) => (
                  <div key={step.number}>{step.number}</div>
                ))}
              </div>
            </div>
            <div className="relative w-0.5 flex-1 overflow-hidden rounded-full bg-fog">
              <div data-rail-fill className="absolute inset-0 origin-top bg-ink" />
            </div>
            <span className="font-mono text-xs tracking-[0.06em] text-brick">/ 03</span>
          </div>

          <ol className="how-list">
            {STEPS.map((step) => {
              const { Illustration } = step;
              return (
                <li
                  key={step.number}
                  data-how-step
                  className="how-step grid border-t border-fog py-14 lg:min-h-[80svh] lg:grid-cols-2 lg:items-center lg:gap-x-16 lg:py-20"
                >
                  <div data-step-copy>
                    <p className="font-mono text-xs tracking-[0.06em] text-ink tabular-nums">
                      Step {step.number} / 03
                    </p>
                    <h3 className="mt-5 text-[clamp(2rem,4vw,56px)] leading-[0.98] font-bold tracking-[-0.03em] text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-5 max-w-md text-base leading-[1.45] tracking-[-0.02em] text-brick sm:text-[19px]">
                      {step.body}
                    </p>
                    <p className="mt-8 max-w-md border-t border-fog pt-5 text-base leading-[1.4] tracking-[-0.02em] text-ink sm:text-[19px]">
                      <span className="font-bold">{step.targetLabel}: </span>
                      <span className="text-alert">{step.targetValue}</span>
                    </p>
                  </div>

                  <figure data-step-figure className="mt-10 flex justify-center lg:mt-0">
                    <Illustration className="w-full max-w-sm sm:max-w-md lg:max-w-lg" />
                    <figcaption className="sr-only">{step.figureCaption}</figcaption>
                  </figure>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
