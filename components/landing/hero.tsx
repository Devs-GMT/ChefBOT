"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { targetChainId } from "@/lib/chain-config";
import chopping from "@/public/food/chopping.jpg";
import riceSkillet from "@/public/food/rice-skillet.jpg";

import { HERO_PHOTO_ALT, HERO_PHOTO_QUALITY, HERO_PHOTO_SIZES } from "./hero-photo";
import { INTRO_REVEAL_EVENT } from "./intro/intro-script";
import { EASE_OUT, gsap, MOTION_OK, ScrollTrigger, SplitText, TOUCH, useGSAP } from "./motion/gsap";

const PROOF = ["3 recipes every time", "No signup", "Receipts on BOT Chain"];

/**
 * realfood.gov-style opening on parchment. Entrance (one timeline): masthead
 * → headline letters rise through masks → lede → media card unveils → proof
 * chips. When the intro plays, the card is already "there" (the intro photo
 * morphs onto it), so the entrance waits for INTRO_REVEAL_EVENT and skips the
 * card. On scroll the headline sinks back while the photo parallaxes inside
 * its frame and the floating photo drifts at its own speed.
 */
export function LandingHero() {
  const chainId = targetChainId();
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(root);
        const headline = SplitText.create(q("[data-hero-line]"), { type: "chars", mask: "chars" });
        const card = q("[data-hero-card]");

        const touch = window.matchMedia(TOUCH).matches;
        const entrance = (fromIntro: boolean) => {
          gsap.set(q("[data-hero]"), { autoAlpha: 1 });
          const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
          tl.from(q("[data-hero-masthead]"), { autoAlpha: 0, y: -12, duration: 0.8 })
            .from(headline.chars, { yPercent: 118, duration: 1.15, stagger: 0.028 }, 0.05)
            .from(q("[data-hero-lede]"), { autoAlpha: 0, y: 24, duration: 1 }, 0.55);
          // Phones: the card is painted from the first frame (it is the LCP
          // element) — only desktop unveils it.
          if (!fromIntro && !touch) {
            tl.from(
              card,
              { clipPath: "inset(18% 10% 0% 10% round 28px)", y: 60, autoAlpha: 0, duration: 1.4 },
              0.5,
            );
          }
          tl.from(q("[data-hero-float]"), { autoAlpha: 0, rotate: 18, scale: 0.6, y: 40, duration: 1.1, ease: "back.out(1.6)" }, 0.95)
            .from(q("[data-hero-chip]"), { autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.08 }, 1.05);
          return tl;
        };

        let pending: (() => void) | null = null;
        if (document.documentElement.classList.contains("intro-active")) {
          // The intro photo becomes the card — keep the card painted under it.
          gsap.set(card, { autoAlpha: 1 });
          const onReveal = () => entrance(true);
          window.addEventListener(INTRO_REVEAL_EVENT, onReveal, { once: true });
          pending = () => window.removeEventListener(INTRO_REVEAL_EVENT, onReveal);
        } else {
          entrance(false);
        }

        // Scroll: headline recedes, photo parallaxes inside its frame —
        // desktop only; phones skip per-frame scroll work here.
        if (touch) {
          return () => pending?.();
        }
        const scrub = true;
        gsap.to(q("[data-hero-title]"), {
          yPercent: -18,
          scale: 0.92,
          autoAlpha: 0.25,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "45% top", scrub: 0.6 },
        });
        gsap.fromTo(
          q("[data-hero-photo]"),
          { yPercent: -7 },
          {
            yPercent: 7,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub },
          },
        );
        gsap.to(q("[data-hero-float]"), {
          y: -140,
          rotate: 9,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub },
        });

        return () => pending?.();
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <section ref={scope} id="hero" className="w-full overflow-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-8 text-center sm:px-6 lg:pt-12">
        <p
          data-hero
          data-hero-masthead
          className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-1 border-y border-ink/15 py-3 font-mono text-[12px] leading-[1.4] tracking-[0.06em] text-brick uppercase"
        >
          <span>{chainId === 677 ? "Mainnet edition" : "Testnet edition"}</span>
          <span aria-hidden="true">·</span>
          <span>Chain ID {chainId}</span>
          <span aria-hidden="true">·</span>
          <span>Three recipes, always</span>
        </p>

        <div data-hero-title className="origin-top">
          <h1
            data-hero
            className="mt-10 text-[clamp(3.6rem,15vw,210px)] leading-[0.82] font-bold tracking-[-0.055em] text-ink"
          >
            <span data-hero-line className="block">
              Real Food.
            </span>
            <span data-hero-line className="block">
              Real Fast.
            </span>
          </h1>

          <p
            data-hero
            data-hero-lede
            className="mx-auto mt-8 max-w-[640px] text-[clamp(1.125rem,2vw,24px)] leading-[1.2] font-medium tracking-[-0.025em] text-ink"
          >
            Tell ChefBOT what&apos;s in your fridge. Get three real recipes in
            seconds — then stamp every dish you actually cook on BOT Chain.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:mt-14">
        <div className="relative">
          <div data-hero-card className="overflow-hidden rounded-[28px]">
            <Link
              href="/app"
              aria-label="Start cooking — open the ChefBOT kitchen"
              className="group relative block aspect-[4/5] overflow-hidden rounded-[28px] bg-wheat sm:aspect-[16/8]"
            >
              <span data-hero-photo className="absolute inset-[-8%_0] block">
                <Image
                  src={riceSkillet}
                  alt={HERO_PHOTO_ALT}
                  placeholder="blur"
                  priority
                  fill
                  quality={HERO_PHOTO_QUALITY}
                  sizes={HERO_PHOTO_SIZES}
                  className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  onLoad={() => ScrollTrigger.refresh()}
                />
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent"
              />
              <span className="absolute bottom-5 left-1/2 flex min-h-14 -translate-x-1/2 items-center gap-3 rounded-full bg-ink py-2 pr-6 pl-2 text-base font-medium whitespace-nowrap text-parchment shadow-card transition-transform group-hover:-translate-y-0.5 sm:bottom-8">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full bg-white text-ink transition-transform duration-500 group-hover:rotate-[120deg]"
                >
                  <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5" fill="currentColor">
                    <path d="M4 2.5v11l9-5.5z" />
                  </svg>
                </span>
                Start cooking
              </span>
            </Link>
          </div>

          <div
            data-hero
            data-hero-float
            className="pointer-events-none absolute -top-8 right-4 hidden w-40 rotate-3 overflow-hidden rounded-2xl border-4 border-parchment shadow-card lg:block xl:-right-6 xl:w-48"
          >
            <Image
              src={chopping}
              alt=""
              placeholder="blur"
              sizes="192px"
              className="aspect-[4/5] h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      <ul className="mx-auto mt-8 flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 pb-4">
        {PROOF.map((item) => (
          <li
            key={item}
            data-hero
            data-hero-chip
            className="flex items-center gap-2 font-mono text-xs tracking-[0.06em] text-brick uppercase"
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-alert" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
