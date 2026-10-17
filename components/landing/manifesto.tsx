"use client";

import { useRef } from "react";

import { Marquee } from "./marquee";
import { SectionTag } from "@/components/ui/section-tag";

import { gsap, ScrollTrigger, SplitText, TOUCH } from "./motion/gsap";
import { useLandingMotion } from "./motion/use-landing-motion";

const TICKER = [
  "ChefBOT Kitchen Brief",
  "No. 001",
  "Real Food. Real Fast.",
  "Cooked on BOT Chain",
  "Chain ID 677",
  "Three recipes, always",
  "Stamped, not scrolled",
  "No signup",
];

/**
 * Press Ink band. As it scrolls in, the band opens from an inset rounded
 * card to full bleed; the heading rises line by line; the body lights word
 * by word with the scroll. The two tickers are driven by GSAP (CSS loop off)
 * so their speed and skew react to scroll velocity.
 */
export function LandingManifesto() {
  const scope = useRef<HTMLElement>(null);

  useLandingMotion(scope, ({ desktop }) => {
    const root = scope.current!;
    const touch = window.matchMedia(TOUCH).matches;

    // A scrubbed clip-path repaints the whole band every frame — desktop only.
    if (desktop) {
      gsap.fromTo(
        root,
        { clipPath: "inset(0% 4% 0% 4% round 48px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          ease: "none",
          scrollTrigger: { trigger: root, start: "top bottom", end: "top 25%", scrub: true },
        },
      );
    }

    const body = root.querySelector<HTMLElement>("[data-manifesto-body]")!;
    const words = SplitText.create(body, { type: "words" }).words;
    gsap.fromTo(
      words,
      { opacity: 0.16 },
      touch
        ? {
            opacity: 1,
            duration: 0.6,
            stagger: 0.03,
            ease: "power1.out",
            scrollTrigger: { trigger: body, start: "top 75%", once: true },
          }
        : {
            opacity: 1,
            stagger: 0.05,
            ease: "none",
            scrollTrigger: { trigger: body, start: "top 82%", end: "bottom 45%", scrub: 0.4 },
          },
    );

    // Tickers. Phones: hand back to the CSS loop (runs on the compositor,
    // zero main-thread work). Desktop: GSAP loops that only run on screen
    // and burst/skew with scroll velocity.
    if (touch) {
      gsap.utils.toArray<HTMLElement>(".marquee--js", root).forEach((el) => el.classList.remove("marquee--js"));
      return () => {
        gsap.utils.toArray<HTMLElement>(".marquee", root).forEach((el) => el.classList.add("marquee--js"));
      };
    }
    const loops = gsap.utils.toArray<HTMLElement>(".marquee__track", root).map((track) => {
      const reverse = track.parentElement?.classList.contains("marquee--reverse");
      return gsap.fromTo(
        track,
        { xPercent: reverse ? -50 : 0 },
        { xPercent: reverse ? 0 : -50, duration: 38, ease: "none", repeat: -1, paused: true },
      );
    });
    const skewTo = gsap.quickTo(gsap.utils.toArray(".marquee__group", root), "skewX", {
      duration: 0.5,
      ease: "power3.out",
    });
    ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause()));
      },
      onUpdate: (self) => {
        const velocity = self.getVelocity();
        const direction = self.direction === -1 ? -1 : 1;
        const boost = 1 + Math.min(6, Math.abs(velocity) / 400);
        // Burst with the scroll, then ease back to cruising speed.
        gsap.to(loops, {
          timeScale: boost * direction,
          duration: 0.25,
          overwrite: true,
          onComplete: () => {
            gsap.to(loops, { timeScale: direction, duration: 1.2, overwrite: true });
            skewTo(0);
          },
        });
        skewTo(gsap.utils.clamp(-12, 12, velocity / -250));
      },
    });
  });

  return (
    <section
      ref={scope}
      id="manifesto"
      aria-labelledby="manifesto-heading"
      className="band-dark w-full bg-ink py-6"
    >
      <Marquee items={TICKER} className="marquee--js border-b border-parchment/10 py-5" />

      <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:py-36">
        <div data-anim="fade-up">
          <SectionTag inverted>The manifesto</SectionTag>
        </div>

        <h2
          id="manifesto-heading"
          className="mt-8 text-[clamp(2.5rem,7vw,115px)] leading-[0.9] font-bold tracking-[-0.035em] text-parchment"
        >
          <span data-anim="lines" className="block">
            Recipe blogs bury the recipe.
          </span>
          <span data-anim="lines" data-delay="0.25" className="mt-2 block text-alert">
            We bury the fluff.
          </span>
        </h2>

        <p
          data-manifesto-body
          className="mt-10 max-w-2xl text-[clamp(1.25rem,2.2vw,26px)] leading-[1.25] tracking-[-0.02em] text-parchment"
        >
          ChefBOT reads your pantry, hands you three recipes that fit the time
          you actually have, and lets you write the dish into BOT Chain when
          it&apos;s done. Food you&apos;ll cook tonight — plus a receipt that
          says you did.
        </p>
      </div>

      <Marquee items={TICKER} reverse className="marquee--js border-t border-parchment/10 py-5" />
    </section>
  );
}
