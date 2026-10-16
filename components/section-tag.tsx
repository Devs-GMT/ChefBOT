import type { ReactNode } from "react";

/**
 * DESIGN.md "Section Label Tag": machine-stamped pill — Geist Mono 12px,
 * +0.06em tracking, 6px/16px padding, radius 100. Inverted variant for
 * Press Ink bands (parchment fill, ink text).
 */
export function SectionTag({
  children,
  inverted = false,
}: {
  children: ReactNode;
  inverted?: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-4 py-1.5 font-mono text-[12px] leading-[1.4] tracking-[0.06em] uppercase ${
        inverted ? "bg-parchment text-ink" : "bg-ink text-white"
      }`}
    >
      {children}
    </span>
  );
}
