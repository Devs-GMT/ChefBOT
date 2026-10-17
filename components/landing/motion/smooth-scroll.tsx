"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect, type ReactNode } from "react";

import { INTRO_DONE_EVENT } from "../intro/intro-script";
import { FINE_POINTER, gsap, MOTION_OK, ScrollTrigger } from "./gsap";

/**
 * Landing-page scroll layer.
 *
 * - Lenis smoothing for mouse/trackpad only (driven by GSAP's ticker so
 *   ScrollTrigger scrubs stay in lock-step). Touch devices keep native
 *   scrolling — Lenis adds nothing there but per-frame work.
 * - In-page anchors go through Lenis when it runs; otherwise the browser's
 *   native smooth scroll + each section's scroll-margin handles them.
 * - Pill nav hides on the way down and returns on the way up.
 * - Scroll stays locked while the intro plays, then ScrollTrigger re-measures.
 * Nothing runs when the visitor prefers reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) {
      return;
    }
    const root = document.documentElement;
    const cleanups: Array<() => void> = [];

    let lenis: Lenis | null = null;
    if (window.matchMedia(FINE_POINTER).matches) {
      const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
      lenis = instance;
      instance.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      if (root.classList.contains("intro-active")) {
        instance.stop();
      }

      const onClick = (event: MouseEvent) => {
        const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
          'a[href^="#"]',
        );
        const hash = link?.getAttribute("href");
        if (!link || !hash || hash === "#") {
          return;
        }
        const target = hash === "#top" ? 0 : document.querySelector<HTMLElement>(hash);
        if (target === null) {
          return;
        }
        event.preventDefault();
        // Lenis honours each section's scroll-margin-top (scroll-mt-24), which
        // already clears the floating nav — no extra offset needed.
        instance.scrollTo(target, { duration: 1.4 });
        history.replaceState(null, "", hash);
      };
      document.addEventListener("click", onClick);
      cleanups.push(() => {
        document.removeEventListener("click", onClick);
        gsap.ticker.remove(tick);
        instance.destroy();
      });
    }

    const onIntroDone = () => {
      lenis?.start();
      ScrollTrigger.refresh();
    };
    window.addEventListener(INTRO_DONE_EVENT, onIntroDone);
    cleanups.push(() => window.removeEventListener(INTRO_DONE_EVENT, onIntroDone));

    // Auto-hiding nav: slide away on the way down, return on the way up.
    const header = document.querySelector<HTMLElement>(".landing-header");
    if (header) {
      // Only tween when the scroll direction flips — not on every update.
      let hidden = false;
      const show = (hide: boolean) => {
        if (hide === hidden) {
          return;
        }
        hidden = hide;
        gsap.to(header, { yPercent: hide ? -160 : 0, duration: 0.5, ease: "power3.out", overwrite: true });
      };
      const navTrigger = ScrollTrigger.create({
        start: 240,
        end: "max",
        onUpdate: (self) => show(self.direction === 1),
        onLeaveBack: () => show(false),
      });
      cleanups.push(() => {
        navTrigger.kill();
        gsap.set(header, { clearProps: "transform" });
      });
    }

    return () => {
      for (const cleanup of cleanups.reverse()) {
        cleanup();
      }
    };
  }, []);

  return <>{children}</>;
}
