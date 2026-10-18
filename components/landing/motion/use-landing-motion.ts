"use client";

import type { RefObject } from "react";

import { afterIntro } from "../intro/intro-script";
import { DESKTOP, EASE_OUT, MOTION_OK, gsap, SplitText, TOUCH, useGSAP } from "./gsap";

export interface MotionContext {
  /** True on viewports ≥1024px, where pinned scenes are allowed. */
  desktop: boolean;
}

/**
 * Declarative reveals any landing section can opt into with a data attribute:
 *
 * - `data-anim="lines"` / `"words"` / `"chars"` — text rises through a mask
 * - `data-anim="fade-up"` — element rises and fades in
 * - `data-anim="line-draw"` — hairline grows from the left (scaleX)
 * - `data-delay="0.2"` — optional extra delay in seconds
 *
 * Every animated element is hidden by CSS only while `html.motion` is set
 * (see globals.css), so no-JS and reduced-motion visitors always see the
 * finished page.
 */
function applyDeclarative(scope: HTMLElement) {
  const nodes = scope.querySelectorAll<HTMLElement>("[data-anim]");
  // Phones animate fewer pieces: letter reveals become word reveals.
  const touch = window.matchMedia(TOUCH).matches;
  nodes.forEach((el) => {
    const declared = el.dataset.anim;
    const kind = touch && declared === "chars" ? "words" : declared;
    const delay = Number(el.dataset.delay ?? 0);
    const trigger = { trigger: el, start: "top 88%", once: true };

    if (kind === "lines" || kind === "words" || kind === "chars") {
      SplitText.create(el, {
        type: kind,
        mask: kind,
        // Re-splitting on resize/font load only matters when line breaks do.
        autoSplit: kind === "lines",
        onSplit(self) {
          gsap.set(el, { autoAlpha: 1 });
          const parts = self[kind];
          return gsap.from(parts, {
            yPercent: 115,
            duration: kind === "chars" ? 0.9 : 1.1,
            ease: EASE_OUT,
            stagger: kind === "lines" ? 0.09 : kind === "words" ? 0.04 : 0.02,
            delay,
            scrollTrigger: trigger,
          });
        },
      });
    } else if (kind === "fade-up") {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE_OUT, delay, scrollTrigger: trigger },
      );
    } else if (kind === "line-draw") {
      gsap.fromTo(
        el,
        { autoAlpha: 1, scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 1.2, ease: EASE_OUT, delay, scrollTrigger: trigger },
      );
    }
  });
}

/**
 * Section motion wrapper: runs declarative reveals plus an optional custom
 * builder, all inside `gsap.matchMedia` so everything is reverted on
 * unmount and nothing runs when the visitor prefers reduced motion.
 */
export function useLandingMotion(
  scope: RefObject<HTMLElement | null>,
  build?: (context: MotionContext) => void | (() => void),
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      const mm = gsap.matchMedia();
      const setup = () =>
        mm.add({ motion: MOTION_OK, desktop: DESKTOP }, (ctx) => {
          const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
          if (!motion) {
            return;
          }
          applyDeclarative(root);
          return build?.({ desktop });
        });

      // Phones: keep animation setup off the load path AND out of scrolling —
      // build each section in an idle gap after load, or as soon as it comes
      // within one screen of the viewport, whichever happens first. (No
      // pinned scenes on touch, so late creation cannot shift pin
      // measurements.) Desktop builds eagerly so pins measure in order.
      const lazy =
        window.matchMedia(TOUCH).matches && typeof IntersectionObserver !== "undefined";
      let observer: IntersectionObserver | null = null;
      let idleHandle = 0;
      let built = false;
      const buildOnce = () => {
        if (built) {
          return;
        }
        built = true;
        observer?.disconnect();
        observer = null;
        setup();
      };
      const win = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };
      // Nothing runs while the intro curtain plays: section setup (SplitText,
      // ScrollTriggers, pins) would compete with it for the main thread, and
      // every section is hidden behind it anyway.
      const begin = () => {
        if (lazy) {
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                buildOnce();
              }
            },
            { rootMargin: "100% 0px" },
          );
          observer.observe(root);
          idleHandle = win.requestIdleCallback
            ? win.requestIdleCallback(buildOnce, { timeout: 4000 })
            : window.setTimeout(buildOnce, 1500);
        } else {
          setup();
        }
      };
      const cancelWait = afterIntro(begin);

      return () => {
        cancelWait();
        observer?.disconnect();
        if (idleHandle) {
          if (win.cancelIdleCallback) {
            win.cancelIdleCallback(idleHandle);
          } else {
            window.clearTimeout(idleHandle);
          }
        }
        mm.revert();
      };
    },
    { scope },
  );
}
