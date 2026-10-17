"use client";

import { useEffect, useRef } from "react";

/**
 * Thin fixed progress bar that tracks how far the page has been scrolled.
 * The bar's transform is written straight to the DOM once per animation
 * frame (no React state), so scrolling never triggers re-renders.
 * Hidden from assistive technology because it is purely decorative.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = bar.current;
    if (!node) {
      return;
    }
    let frame = 0;
    // Reading scrollHeight every frame forces a layout right after animation
    // writes — measure it only when the page size changes.
    let scrollable = 0;
    const measure = () => {
      const doc = document.documentElement;
      scrollable = doc.scrollHeight - doc.clientHeight;
    };
    const update = () => {
      frame = 0;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      node.style.transform = `scaleX(${progress})`;
    };
    const sizes =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            measure();
            update();
          });
    sizes?.observe(document.body);
    measure();
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      sizes?.disconnect();
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-ink/10">
      <div ref={bar} className="h-full origin-left bg-ink" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
