"use client";

import { useEffect, useState } from "react";

/**
 * Thin fixed progress bar that tracks how far the page has been scrolled.
 * Hidden from assistive technology because it is purely decorative.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const value = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, value)));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-ink/10"
    >
      <div
        className="h-full origin-left bg-ink"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}