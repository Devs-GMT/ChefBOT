"use client";

import { gsap } from "../motion/gsap";
import type { StepKind } from "./steps";

/**
 * Keyframe choreography for each "How it works" illustration. Each builder
 * returns a paused-agnostic timeline (≈1.6s) that targets the `data-anim`
 * hooks inside the SVG. The desktop scene nests them in one scrubbed master
 * timeline; mobile plays each one when its panel scrolls in.
 */
type Builder = (figure: HTMLElement) => gsap.core.Timeline;

const all = (figure: HTMLElement, hook: string) =>
  figure.querySelectorAll<SVGElement>(`[data-anim="${hook}"]`);

const pantry: Builder = (figure) => {
  const tl = gsap.timeline();
  tl.from(all(figure, "draw"), { drawSVG: "0%", duration: 0.9, ease: "power2.inOut", stagger: 0.15 })
    .from(all(figure, "draw"), { fillOpacity: 0, duration: 0.4 }, "-=0.3")
    // The door is drawn swung open; start it closed against the hinge (its right edge).
    .from(all(figure, "door"), { scaleX: 0.08, transformOrigin: "100% 50%", duration: 0.8, ease: "back.out(1.6)" }, "-=0.2")
    .from(
      all(figure, "item"),
      { scale: 0, y: 24, transformOrigin: "50% 100%", duration: 0.6, ease: "back.out(2.2)", stagger: 0.09 },
      "-=0.35",
    );
  return tl;
};

const recipes: Builder = (figure) => {
  const tl = gsap.timeline();
  tl.from(all(figure, "card-front"), { y: 80, scale: 0.86, autoAlpha: 0, transformOrigin: "50% 100%", duration: 0.7, ease: "power3.out" })
    .from(all(figure, "card-back"), { x: 70, rotate: 12, autoAlpha: 0, transformOrigin: "50% 100%", duration: 0.7, ease: "back.out(1.4)" }, "-=0.35")
    .from(all(figure, "card-middle"), { x: -70, rotate: -10, autoAlpha: 0, transformOrigin: "50% 100%", duration: 0.7, ease: "back.out(1.4)" }, "<0.08")
    .to(all(figure, "card-front"), { y: -12, duration: 0.45, ease: "power2.out" })
    .from(all(figure, "check"), { scale: 0, rotate: -120, transformOrigin: "50% 50%", duration: 0.55, ease: "back.out(2.4)" }, "-=0.15")
    .from(all(figure, "plate"), { x: -60, rotate: -30, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "power3.out" }, "-=0.5");
  return tl;
};

const stamp: Builder = (figure) => {
  const seal = all(figure, "seal");
  const tl = gsap.timeline();
  tl.from(all(figure, "receipt"), { y: -60, autoAlpha: 0, duration: 0.6, ease: "power3.out" })
    .from(all(figure, "receipt-line"), { drawSVG: "0%", duration: 0.35, ease: "power1.inOut", stagger: 0.07 }, "-=0.2")
    // Slam: fall in big and fast, squash on impact, settle.
    .from(seal, { scale: 2.6, rotate: -70, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.45, ease: "power4.in" })
    .to(seal, { scaleX: 1.14, scaleY: 0.84, duration: 0.09, ease: "power1.out" })
    .to(seal, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1, 0.35)" })
    .from(all(figure, "burst"), { scale: 0.5, autoAlpha: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2)" }, "<")
    .from(figure.querySelectorAll('[data-anim="chain"] rect'), { x: -36, autoAlpha: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" }, "-=0.4");
  return tl;
};

export const STEP_TIMELINES: Record<StepKind, Builder> = { pantry, recipes, stamp };
