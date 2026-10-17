"use client";

import Image from "next/image";
import { useRef } from "react";

import greens from "@/public/food/greens.jpg";
import poke from "@/public/food/poke-bowl.jpg";
import riceSkillet from "@/public/food/rice-skillet.jpg";

import { HERO_PHOTO_QUALITY, HERO_PHOTO_SIZES } from "../hero-photo";
import { EASE_IN_OUT, EASE_OUT, gsap, MOTION_OK, SplitText, TOUCH, useGSAP } from "../motion/gsap";
import {
  INTRO_DONE_EVENT,
  INTRO_REVEAL_EVENT,
  INTRO_SEEN_KEY,
  isLiteDevice,
  PREPAINT_SCRIPT,
  shouldPlayIntro,
} from "./intro-script";

/** Longest we wait for the photo / an idle main thread before starting. */
const START_WAIT_MS = 1200;

/** Clip state, tweened as plain numbers and written as a full inset() — the
 *  browser serialises clip-path in a shortened form GSAP cannot pair up. */
interface Clip {
  top: number;
  side: number;
  radius: number;
}
const clipFor = (w: number, h: number, d: number): Clip => ({
  top: (h - d) / 2,
  side: (w - d) / 2,
  radius: d / 2,
});
const clipCss = ({ top, side, radius }: Clip) =>
  `inset(${top}px ${side}px ${top}px ${side}px round ${radius}px)`;

/**
 * First-visit intro (once per session).
 *
 * The centre "circle" is not a separate image: it is one fixed photo layer
 * that already IS the hero card — same image URL, same crop box — clipped to
 * a circle (clip-path inset … round) and moved over the intro anchor. The
 * circle therefore shows the middle of the final hero framing (food, never
 * the table), and the morph just releases the clip and slides the layer
 * onto the card: the last frame is pixel-identical to the hero, so the layer
 * is dropped with no fade. Transform + clip-path only → no layout shift.
 *
 * Phones get a shorter cut (no counter, one side photo, ~2.6s). Start waits
 * for the photo to decode and the main thread to go idle so hydration never
 * stutters the opening. Click / key / wheel fast-forwards.
 */
export function IntroCurtain() {
  const overlay = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = document.documentElement;
      const node = overlay.current;
      const reduced = !window.matchMedia(MOTION_OK).matches;

      // Client-side navigation never runs the inline script — mirror it here.
      if (!reduced) {
        root.classList.add("motion");
        let seen = false;
        try {
          seen = sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
        } catch {
          seen = false;
        }
        const lite = isLiteDevice(navigator as Navigator & { deviceMemory?: number });
        if (shouldPlayIntro({ seen, reduced, lite }) && !root.classList.contains("intro-active")) {
          root.classList.add("intro-active");
        }
      }
      root.classList.add("motion-ready");

      if (!node || !root.classList.contains("intro-active")) {
        return () => root.classList.remove("motion", "motion-ready", "intro-active");
      }

      window.scrollTo(0, 0);
      const phone = window.matchMedia(TOUCH).matches || window.innerWidth < 640;
      const q = gsap.utils.selector(node);
      const bg = q("[data-intro-bg]");
      const anchor = q("[data-intro-anchor]")[0] as HTMLElement;
      const layer = q("[data-intro-photo]")[0] as HTMLElement;
      const inner = q("[data-intro-photo-inner]")[0] as HTMLElement;
      const sides = q("[data-intro-side]").filter((el) => getComputedStyle(el).display !== "none");
      const word = SplitText.create(q("[data-intro-word]"), { type: "chars", mask: "chars" });
      const count = q("[data-intro-count]")[0] as HTMLElement;
      const meta = q("[data-intro-meta]");
      const counter = { value: 0 };
      let morph: gsap.core.Timeline | null = null;
      const clip: Clip = { top: 0, side: 0, radius: 0 };
      const paintClip = () => {
        layer.style.clipPath = clipCss(clip);
      };
      let finished = false;
      let tl: gsap.core.Timeline | null = null;

      /** Size the layer as the hero card; return the anchor-centred circle pose. */
      const pose = () => {
        const card = document.querySelector<HTMLElement>("[data-hero-card]");
        const cardRect = card?.getBoundingClientRect();
        const a = anchor.getBoundingClientRect();
        const w = cardRect?.width ?? a.width;
        const h = cardRect?.height ?? a.height;
        return {
          card: cardRect,
          w,
          h,
          d: a.width,
          x: a.left + a.width / 2 - w / 2,
          y: a.top + a.height / 2 - h / 2,
        };
      };

      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        // Swap in the same frame: real card on, morph layer off.
        const card = document.querySelector<HTMLElement>("[data-hero-card]");
        if (card) {
          gsap.set(card, { autoAlpha: 1 });
        }
        gsap.set(layer, { autoAlpha: 0 });
        root.classList.remove("intro-active");
        try {
          sessionStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          // Storage unavailable — the intro simply plays again next visit.
        }
        window.dispatchEvent(new Event(INTRO_DONE_EVENT));
      };

      const morphIntoHero = () => {
        const p = pose(); // re-measure: fonts may have nudged the layout
        if (!p.card) {
          gsap.to(layer, { autoAlpha: 0, duration: 0.4, onComplete: finish });
          return;
        }
        // Hide the real card while the layer travels so its edges never peek
        // out around the morph; finish() swaps them in the same frame.
        const cardEl = document.querySelector<HTMLElement>("[data-hero-card]");
        if (cardEl) {
          gsap.set(cardEl, { autoAlpha: 0 });
        }
        const heroPhoto = document.querySelector<HTMLElement>("[data-hero-photo]");
        const heroShift = heroPhoto ? Number(gsap.getProperty(heroPhoto, "yPercent")) || 0 : 0;
        morph = gsap
          .timeline({ defaults: { duration: 1.15, ease: EASE_IN_OUT }, onComplete: finish })
          .to(layer, { x: p.card.left, y: p.card.top, rotate: 0 })
          .to(clip, { top: 0, side: 0, radius: 28, onUpdate: paintClip }, 0)
          .to(inner, { yPercent: heroShift }, 0);
        if (tl) {
          morph.timeScale(tl.timeScale());
        }
      };

      const build = () => {
        const p = pose();
        Object.assign(clip, clipFor(p.w, p.h, 0));
        paintClip();
        gsap.set(layer, { width: p.w, height: p.h, x: p.x, y: p.y, visibility: "visible" });

        tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
        tl.fromTo(layer, { rotate: -14 }, { rotate: 0, duration: 1.1, ease: "back.out(1.4)" })
          .to(clip, { ...clipFor(p.w, p.h, p.d), duration: 1.1, ease: "back.out(1.4)", onUpdate: paintClip }, 0)
          .from(
            sides,
            {
              scale: 0,
              rotate: (i: number) => (i === 0 ? -24 : 24),
              autoAlpha: 0,
              duration: 0.9,
              stagger: 0.12,
              ease: "back.out(1.8)",
            },
            "-=0.85",
          )
          .from(word.chars, { yPercent: 115, duration: 0.9, stagger: 0.035 }, "-=0.75")
          .from(meta, { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.08 }, "<");
        if (!phone) {
          tl.to(
            counter,
            {
              value: 100,
              duration: 1.5,
              ease: "power2.inOut",
              onUpdate: () => {
                count.textContent = String(Math.round(counter.value)).padStart(3, "0");
              },
            },
            0.15,
          );
        }
        tl.addLabel("exit", phone ? "+=0.05" : "+=0.1")
          .to(word.chars, { yPercent: -115, duration: 0.55, stagger: 0.018, ease: "power3.in" }, "exit")
          .to(meta, { autoAlpha: 0, duration: 0.3 }, "exit")
          .to(sides[0] ?? [], { x: "-62vw", y: "-24vh", rotate: -50, duration: 1, ease: EASE_IN_OUT }, "exit")
          .to(sides[1] ?? [], { x: "62vw", y: "22vh", rotate: 50, duration: 1, ease: EASE_IN_OUT }, "exit")
          .add(morphIntoHero, "exit+=0.2")
          .add(() => window.dispatchEvent(new Event(INTRO_REVEAL_EVENT)), "exit+=0.3")
          .to(bg, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: EASE_IN_OUT }, "exit+=0.2");

        const header = document.querySelector(".landing-header");
        if (header) {
          tl.from(header, { yPercent: -180, duration: 1, ease: EASE_OUT }, "exit+=0.75");
        }
        if (phone) {
          tl.timeScale(1.4); // ≈2.6s on phones
        }
      };

      // Start once the photo is decoded and the main thread is idle (capped),
      // so the opening frames never fight hydration work.
      let started = false;
      const start = () => {
        if (!started) {
          started = true;
          build();
        }
      };
      const img = layer.querySelector("img");
      const decoded = img?.decode ? img.decode().catch(() => undefined) : Promise.resolve();
      const capTimer = window.setTimeout(start, START_WAIT_MS);
      void decoded.then(() => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
          .requestIdleCallback;
        if (idle) {
          idle(start, { timeout: 300 });
        } else {
          window.setTimeout(start, 0);
        }
      });

      const fastForward = () => {
        tl?.timeScale(3.5);
        morph?.timeScale(3.5);
      };
      window.addEventListener("pointerdown", fastForward, { once: true });
      window.addEventListener("keydown", fastForward, { once: true });
      window.addEventListener("wheel", fastForward, { once: true, passive: true });

      // Never leave the visitor stuck behind the curtain.
      const safety = window.setTimeout(finish, 8000);

      return () => {
        window.clearTimeout(safety);
        window.clearTimeout(capTimer);
        window.removeEventListener("pointerdown", fastForward);
        window.removeEventListener("keydown", fastForward);
        window.removeEventListener("wheel", fastForward);
        morph?.kill();
        // Navigating away mid-intro must unlock the page.
        root.classList.remove("motion", "motion-ready", "intro-active");
      };
    },
    { scope: overlay },
  );

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
      <div ref={overlay} className="intro-overlay" aria-hidden="true">
        <div data-intro-bg className="absolute inset-0 bg-[#066742]" />

        {/* The hero photo itself, clipped to a circle until it morphs onto the card. */}
        <div
          data-intro-photo
          className="invisible fixed top-0 left-0 z-10 overflow-hidden will-change-[transform,clip-path]"
        >
          <span data-intro-photo-inner className="absolute inset-[-8%_0] block">
            <Image
              src={riceSkillet}
              alt=""
              fill
              priority
              quality={HERO_PHOTO_QUALITY}
              sizes={HERO_PHOTO_SIZES}
              className="object-cover"
            />
          </span>
        </div>

        <div className="relative flex h-full w-full flex-col items-center justify-center">
          <p
            data-intro-meta
            className="absolute top-8 left-1/2 -translate-x-1/2 font-mono text-[12px] tracking-[0.12em] whitespace-nowrap text-parchment/70 uppercase"
          >
            ChefBOT · Kitchen brief No. 001
          </p>

          {/* Anchor box: where the circle sits and what the side photos orbit. */}
          <div data-intro-anchor className="relative size-[62vmin] sm:size-[46vmin]">
            <div
              data-intro-side
              className="absolute -top-[16vmin] -left-[30vmin] z-20 size-[22vmin] overflow-hidden rounded-full border-4 border-parchment shadow-card"
            >
              <Image src={greens} alt="" sizes="22vmin" quality={60} placeholder="blur" className="h-full w-full object-cover" />
            </div>
            <div
              data-intro-side
              className="absolute -right-[30vmin] -bottom-[14vmin] z-20 hidden size-[24vmin] overflow-hidden rounded-full border-4 border-parchment shadow-card sm:block"
            >
              <Image src={poke} alt="" sizes="24vmin" quality={60} placeholder="blur" className="h-full w-full object-cover" />
            </div>

            <p
              data-intro-word
              className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-[clamp(3.5rem,15vw,220px)] leading-[0.85] font-bold tracking-[-0.05em] whitespace-nowrap text-parchment [text-shadow:0_8px_40px_rgba(0,0,0,0.35)]"
            >
              Real Food.
            </p>
          </div>

          <p
            data-intro-meta
            className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-baseline gap-3 font-mono text-[12px] tracking-[0.12em] text-parchment/70 uppercase sm:flex"
          >
            Preheating
            <span data-intro-count className="text-[28px] tracking-normal text-parchment tabular-nums">
              000
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
