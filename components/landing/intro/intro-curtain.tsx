"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

import greens from "@/public/food/greens.jpg";
import poke from "@/public/food/poke-bowl.jpg";
import riceSkillet from "@/public/food/rice-skillet.jpg";

import { HERO_PHOTO_QUALITY, HERO_PHOTO_SIZES } from "../hero-photo";
import { gsap, MOTION_OK, TOUCH } from "../motion/gsap";
import {
  INTRO_DONE_EVENT,
  INTRO_REVEAL_EVENT,
  INTRO_SEEN_KEY,
  introElapsedMs,
  isLiteDevice,
  shouldPlayIntro,
  splitIntroWord,
} from "./intro-script";

/** Longest we wait for the photo to decode before the exit starts. */
const DECODE_WAIT_MS = 1200;
/** Never leave the visitor stuck behind the curtain. */
const SAFETY_MS = 8000;
const FAST_FORWARD = 3.5;

// GSAP-equivalent curves for the Web Animations API.
const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EXPO_IN_OUT = "cubic-bezier(0.87, 0, 0.13, 1)";
const POWER3_IN = "cubic-bezier(0.32, 0, 0.67, 0)";
/** Phones: a softer in-out, so the short morph glides instead of jumping. */
const POWER3_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
/** Phones: the circle → card morph — an even, unhurried glide. */
const PHONE_MORPH = "cubic-bezier(0.45, 0, 0.25, 1)";

const WORD = splitIntroWord("Real Food.");

const powerInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * First-visit intro (once per session).
 *
 * Opening (circle pops, side photos, "Real Food." rises, meta fades) is pure
 * CSS keyframes on transform/opacity — see `.intro-*` in globals.css. The
 * compositor plays it from the first paint, so hydration and other main-
 * thread work can't make it stutter, and no JS is needed until the exit.
 *
 * The centre "circle" is the hero card's own photo: a layer sized like the
 * card (same image URL and crop) clipped to a circle. The exit (Web
 * Animations, also compositor-driven except the short clip morph) slides
 * that layer onto the card and releases the clip — the last frame matches
 * the card, so the layer is dropped with no fade. Phones play 1.15× faster
 * with a softer glide, side photos kept on screen and flying out vertically,
 * the circle easing into the card's shape over the whole trip down, and no
 * counter. Click / key / wheel fast-forwards.
 */
export function IntroCurtain() {
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const node = overlay.current;
    const reduced = !window.matchMedia(MOTION_OK).matches;

    // Client-side navigation never runs the inline script — mirror it here.
    let readded = false;
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
        readded = true;
      }
    }
    root.classList.add("motion-ready");

    if (!node || !root.classList.contains("intro-active")) {
      return () => root.classList.remove("motion", "motion-ready", "intro-active");
    }

    // Dev only: Strict Mode's remount resets <html>'s classes, so re-adding
    // them restarts the CSS opening (a second intro). Continue where it was.
    // A stale start (client navigation back to a half-played intro) is
    // ignored: that intro plays from the top.
    const elapsed = introElapsedMs(performance.now());
    if (readded && elapsed > 50 && elapsed < 5000) {
      for (const anim of node.getAnimations({ subtree: true })) {
        anim.currentTime = elapsed;
      }
    }

    window.scrollTo(0, 0);
    const phone = window.matchMedia(TOUCH).matches || window.innerWidth < 640;
    // Keep in sync with the phone `--k` in globals.css.
    const k = phone ? 1 / 1.15 : 1;
    const glide = phone ? POWER3_IN_OUT : EXPO_IN_OUT;
    const layer = node.querySelector<HTMLElement>("[data-intro-photo]")!;
    const inner = node.querySelector<HTMLElement>("[data-intro-photo-inner]")!;
    const anchor = node.querySelector<HTMLElement>("[data-intro-anchor]")!;
    const bg = node.querySelector<HTMLElement>("[data-intro-bg]")!;
    const count = node.querySelector<HTMLElement>("[data-intro-count]");
    const chars = [...node.querySelectorAll<HTMLElement>(".intro-char")];
    const metas = [...node.querySelectorAll<HTMLElement>("[data-intro-meta]")];
    const sides = [...node.querySelectorAll<HTMLElement>("[data-intro-side]")].filter(
      (el) => getComputedStyle(el).display !== "none",
    );
    const header = document.querySelector<HTMLElement>(".landing-header");

    const exitAnims: Animation[] = [];
    let rate = 1;
    let finished = false;
    let disposed = false;
    let headerAnim: Animation | null = null;
    let raf = 0;

    const play = (
      el: Element,
      keyframes: Keyframe[],
      { duration, delay = 0, easing = EXPO_IN_OUT }: { duration: number; delay?: number; easing?: string },
    ) => {
      const anim = el.animate(keyframes, {
        duration: duration * 1000 * k,
        delay: delay * 1000 * k,
        easing,
        fill: "forwards",
      });
      anim.playbackRate = rate;
      exitAnims.push(anim);
      return anim;
    };

    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      performance.mark("intro-done");
      cancelAnimationFrame(raf);
      // Swap in the same frame: real card on, morph layer off.
      const card = document.querySelector<HTMLElement>("[data-hero-card]");
      if (card) {
        gsap.set(card, { autoAlpha: 1 });
      }
      layer.style.visibility = "hidden";
      root.classList.remove("intro-active", "intro-exiting");
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // Storage unavailable — the intro simply plays again next visit.
      }
      window.dispatchEvent(new Event(INTRO_DONE_EVENT));
      // Hand the header back to its own (GSAP) auto-hide once it has landed.
      if (headerAnim) {
        const anim = headerAnim;
        void anim.finished.then(() => anim.cancel(), () => undefined);
      }
    };

    // Desktop counter: time-based, so a late hydration just catches up.
    if (!phone && count) {
      const pop = layer.getAnimations()[0];
      const tick = () => {
        const now = Number(document.timeline.currentTime ?? 0);
        const start = Number(pop?.startTime ?? now);
        const t = ((now - start) * (pop?.playbackRate ?? 1)) / 1000 - 0.15;
        const p = Math.min(1, Math.max(0, t / 1.5));
        count.textContent = String(Math.round(100 * powerInOut(p))).padStart(3, "0");
        if (p < 1 && !finished) {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
    }

    const morphIntoHero = () => {
      const card = document.querySelector<HTMLElement>("[data-hero-card]");
      if (!card) {
        play(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: 0.4 }).onfinish = finish;
        return;
      }
      // Re-measure: fonts may have nudged the layout since the CSS sizing.
      const c = card.getBoundingClientRect();
      let l = layer.getBoundingClientRect();
      if (Math.abs(l.width - c.width) > 1 || Math.abs(l.height - c.height) > 1) {
        layer.style.setProperty("--cw", `${c.width}px`);
        layer.style.setProperty("--ch", `${c.height}px`);
        l = layer.getBoundingClientRect();
      }
      const d = anchor.getBoundingClientRect().width;
      const top = (l.height - d) / 2;
      const side = (l.width - d) / 2;
      // Hide the real card while the layer travels so its edges never peek
      // out around the morph; finish() swaps them in the same frame.
      gsap.set(card, { autoAlpha: 0 });
      const heroPhoto = document.querySelector<HTMLElement>("[data-hero-photo]");
      const heroShift = heroPhoto ? Number(gsap.getProperty(heroPhoto, "yPercent")) || 0 : 0;
      const travel = `translate(${c.left - l.left}px, ${c.top - l.top}px)`;
      if (phone) {
        // Phones (tall 4:5 card): one animation for position + shape, sampled
        // in steps so both always share the same progress. The clip box grows
        // linearly while its "roundness" (radius / half the short side) eases
        // linearly from a full circle to the card's 28px — circle → pill →
        // rounded card, spread evenly over the whole trip down.
        const dx = c.left - l.left;
        const dy = c.top - l.top;
        const endRatio = 28 / (Math.min(l.width, l.height) / 2);
        const steps = 12;
        const frames: Keyframe[] = [];
        for (let i = 0; i <= steps; i++) {
          const o = i / steps;
          const t = top * (1 - o);
          const s = side * (1 - o);
          const ratio = 1 + (endRatio - 1) * o;
          const r = (ratio * Math.min(l.width - 2 * s, l.height - 2 * t)) / 2;
          frames.push({
            offset: o,
            transform: `translate(${dx * o}px, ${dy * o}px)`,
            clipPath: `inset(${t}px ${s}px ${t}px ${s}px round ${r}px)`,
          });
        }
        const morph = play(layer, frames, { duration: 1.6, easing: PHONE_MORPH });
        play(inner, [{ transform: "none" }, { transform: `translateY(${heroShift}%)` }], {
          duration: 1.6,
          easing: PHONE_MORPH,
        });
        morph.onfinish = finish;
        return;
      }
      const morph = play(
        layer,
        [
          { transform: "none", clipPath: `inset(${top}px ${side}px ${top}px ${side}px round ${d / 2}px)` },
          { transform: travel, clipPath: "inset(0px 0px 0px 0px round 28px)" },
        ],
        { duration: 1.15, easing: glide },
      );
      play(inner, [{ transform: "none" }, { transform: `translateY(${heroShift}%)` }], {
        duration: 1.15,
        easing: glide,
      });
      morph.onfinish = finish;
    };

    const exit = () => {
      if (disposed || finished) {
        return;
      }
      performance.mark("intro-exit");
      // The page behind turns cream again just before the curtain lifts.
      root.classList.add("intro-exiting");
      cancelAnimationFrame(raf);
      if (count) {
        count.textContent = "100";
      }
      chars.forEach((el, i) =>
        play(el, [{ transform: "none" }, { transform: "translateY(-115%)" }], {
          duration: phone ? 0.45 : 0.55,
          delay: i * (phone ? 0.012 : 0.018),
          easing: POWER3_IN,
        }),
      );
      metas.forEach((el) => play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 0.3, easing: "linear" }));
      // Portrait phones: the side photos leave up and down, not sideways.
      const flights = phone
        ? ["translate(-20vw, -70vh) rotate(-40deg)", "translate(20vw, 70vh) rotate(40deg)"]
        : ["translate(-62vw, -24vh) rotate(-50deg)", "translate(62vw, 22vh) rotate(50deg)"];
      sides.forEach((el, i) =>
        play(el, [{ transform: "none" }, { transform: flights[i] ?? flights[0] }], { duration: 1, easing: glide }),
      );
      // Phones: the circle visibly starts toward the card before the green lifts.
      play(bg, [{ transform: "none" }, { transform: "translateY(-100%)" }], {
        duration: phone ? 1.4 : 1.1,
        delay: phone ? 0.3 : 0.2,
        easing: glide,
      });
      // Timeline markers as empty animations, so fast-forward scales them too.
      play(node, [], { duration: 0.2 }).onfinish = morphIntoHero;
      play(node, [], { duration: 0.3 }).onfinish = () =>
        window.dispatchEvent(new Event(INTRO_REVEAL_EVENT));
      if (header) {
        headerAnim = play(header, [{ transform: "translateY(-180%)" }, { transform: "none" }], {
          duration: 1,
          delay: 0.75,
          easing: EXPO_OUT,
        });
      }
    };

    // Exit once the CSS opening has played and the photo is decoded (capped).
    const opening = node.getAnimations({ subtree: true });
    const img = layer.querySelector("img");
    const decoded = Promise.race([
      img?.decode ? img.decode().catch(() => undefined) : Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, DECODE_WAIT_MS)),
    ]);
    const hold = phone ? 0.05 : 0.1;
    void Promise.all([decoded, ...opening.map((a) => a.finished.catch(() => undefined))]).then(() =>
      window.setTimeout(exit, (hold * 1000 * k) / rate),
    );

    const fastForward = () => {
      rate = FAST_FORWARD;
      for (const anim of [...node.getAnimations({ subtree: true }), ...exitAnims]) {
        anim.playbackRate = FAST_FORWARD;
      }
    };
    window.addEventListener("pointerdown", fastForward, { once: true });
    window.addEventListener("keydown", fastForward, { once: true });
    window.addEventListener("wheel", fastForward, { once: true, passive: true });

    const safety = window.setTimeout(finish, SAFETY_MS);

    return () => {
      disposed = true;
      window.clearTimeout(safety);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", fastForward);
      window.removeEventListener("keydown", fastForward);
      window.removeEventListener("wheel", fastForward);
      for (const anim of exitAnims) {
        anim.cancel();
      }
      // Navigating away mid-intro must unlock the page.
      root.classList.remove("motion", "motion-ready", "intro-active", "intro-first", "intro-exiting");
    };
  }, []);

  return (
    <>
      {/* Inline display:none until globals.css (with !important) shows it. */}
      <div ref={overlay} className="intro-overlay" aria-hidden="true" style={{ display: "none" }}>
        <div data-intro-bg className="absolute inset-0 bg-[#066742]" />

        {/* The hero photo itself, clipped to a circle until it morphs onto the card. */}
        <div data-intro-photo className="intro-photo">
          <span data-intro-photo-inner className="absolute inset-[-8%_0] block">
            <Image
              src={riceSkillet}
              alt=""
              fill
              priority
              placeholder="blur"
              quality={HERO_PHOTO_QUALITY}
              sizes={HERO_PHOTO_SIZES}
              className="object-cover"
            />
          </span>
        </div>

        <div className="relative flex h-full w-full flex-col items-center justify-center">
          <p
            data-intro-meta
            style={{ "--i": 0 } as CSSProperties}
            className="absolute top-[max(2rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 font-mono text-[12px] tracking-[0.12em] whitespace-nowrap text-parchment/70 uppercase"
          >
            ChefBOT · Kitchen brief No. 001
          </p>

          {/* Anchor box: where the circle sits and what the side photos orbit. */}
          <div data-intro-anchor className="relative size-[62vmin] sm:size-[46vmin]">
            <div
              data-intro-side
              style={{ "--i": 0, "--r": "-24deg" } as CSSProperties}
              className="absolute -top-[24vw] -left-[12vw] z-20 size-[28vw] overflow-hidden rounded-full border-4 border-parchment shadow-card sm:-top-[16vmin] sm:-left-[30vmin] sm:size-[22vmin]"
            >
              <Image
                src={greens}
                alt=""
                sizes="(max-width: 639px) 28vw, 22vmin"
                quality={60}
                placeholder="blur"
                className="h-full w-full object-cover"
              />
            </div>
            <div
              data-intro-side
              style={{ "--i": 1, "--r": "24deg" } as CSSProperties}
              className="absolute -right-[12vw] -bottom-[24vw] z-20 size-[28vw] overflow-hidden rounded-full border-4 border-parchment shadow-card sm:-right-[30vmin] sm:-bottom-[14vmin] sm:size-[24vmin]"
            >
              <Image
                src={poke}
                alt=""
                sizes="(max-width: 639px) 28vw, 24vmin"
                quality={60}
                placeholder="blur"
                className="h-full w-full object-cover"
              />
            </div>

            <p
              data-intro-word
              className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-[clamp(3.5rem,15vw,220px)] leading-[0.85] font-bold tracking-[-0.05em] whitespace-nowrap text-parchment [text-shadow:0_8px_40px_rgba(0,0,0,0.35)]"
            >
              {WORD.map((word, w) => (
                <span key={w}>
                  {w > 0 ? " " : null}
                  {word.map(({ ch, i }) => (
                    <span key={i} className="intro-char-mask">
                      <span className="intro-char" style={{ "--i": i } as CSSProperties}>
                        {ch}
                      </span>
                    </span>
                  ))}
                </span>
              ))}
            </p>
          </div>

          <p
            data-intro-meta
            style={{ "--i": 1 } as CSSProperties}
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
