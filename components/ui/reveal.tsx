"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

export type RevealEffect = "up" | "fade" | "left" | "right" | "grow";

export interface RevealProps {
  children: ReactNode;
  /** Animation direction when the element enters the viewport. */
  effect?: RevealEffect;
  /** Extra delay before the animation starts, in milliseconds. */
  delay?: number;
  className?: string;
  /** Element to render. Defaults to a div. */
  as?: ElementType;
}

/**
 * Plays a one-shot entrance animation when the element scrolls into view
 * using IntersectionObserver. Visibility is flipped straight on the DOM
 * attribute (an external system) so the effect never triggers a re-render.
 * The prefers-reduced-motion CSS overrides neutralise the animation, and a
 * noscript style keeps content visible when JavaScript is unavailable.
 */
export function Reveal({
  children,
  effect = "up",
  delay = 0,
  className = "",
  as,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const show = () => node.setAttribute("data-visible", "true");

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Cast keeps JSX typing simple while still rendering the requested tag.
  const Tag = (as ?? "div") as "div";
  const style = {
    ...(delay > 0 ? { "--reveal-delay": `${delay}ms` } : {}),
  } as CSSProperties;

  return (
    <Tag
      ref={ref}
      data-reveal={effect}
      data-visible="false"
      style={style}
      className={className}
    >
      {children}
    </Tag>
  );
}