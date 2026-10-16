"use client";

import { useEffect, useRef } from "react";

export interface CounterProps {
  /** Final value to count up to. */
  value: number;
  /** Suffix rendered after the number, e.g. "s" or "%". */
  suffix?: string;
  /** Optional class applied only to the suffix (e.g. accent colour). */
  suffixClassName?: string;
  /** Animation duration in milliseconds. */
  durationMs?: number;
  className?: string;
}

/**
 * Counts from 0 up to `value` the first time it scrolls into view. The
 * digits are written straight into the DOM from the effect (no React
 * state, no re-renders), and prefers-reduced-motion jumps to the final
 * value immediately.
 */
export function Counter({
  value,
  suffix = "",
  suffixClassName = "",
  durationMs = 1400,
  className = "",
}: CounterProps) {
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = numberRef.current;
    if (!node) {
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      node.textContent = String(value);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        observer.disconnect();
        node.textContent = "0";
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - t, 3);
          node.textContent = String(Math.round(value * eased));
          if (t < 1) {
            frame = requestAnimationFrame(tick);
          }
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs]);

  return (
    <span className={`tabular-nums ${className}`}>
      <span ref={numberRef}>{value}</span>
      {suffix ? <span className={suffixClassName}>{suffix}</span> : null}
    </span>
  );
}