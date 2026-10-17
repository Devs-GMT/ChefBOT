"use client";

import { Fragment, useEffect, useRef, type ElementType, type Ref } from "react";

export interface ScrollLettersProps {
  text: string;
  className?: string;
  /** Element to render. Defaults to h2. */
  as?: ElementType;
  /** Optional id for aria-labelledby wiring. */
  id?: string;
}

/**
 * Letter-by-letter scroll reveal (PRD §6 motion): each letter rises and
 * lights up as the block travels from 92% to 40% of the viewport, driven by
 * scroll progress. Screen readers get the plain sentence once; the per-letter
 * spans are decorative. Reduced motion shows everything immediately.
 */
export function ScrollLetters({ text, className = "", as, id }: ScrollLettersProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const letters = Array.from(
      node.querySelectorAll<HTMLElement>("[data-scroll-letter]"),
    );
    if (letters.length === 0) {
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      for (const letter of letters) {
        letter.setAttribute("data-lit", "true");
      }
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 0.92;
      const end = viewport * 0.4;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
      const litCount = Math.ceil(progress * letters.length);
      letters.forEach((letter, index) => {
        const lit = index < litCount;
        if ((letter.getAttribute("data-lit") === "true") !== lit) {
          letter.setAttribute("data-lit", lit ? "true" : "false");
        }
      });
    };

    const onScroll = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
    };
  }, [text]);

  const Tag = (as ?? "h2") as "h2";
  const words = text.split(" ");

  return (
    <Tag ref={ref as Ref<HTMLHeadingElement>} id={id} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          <Fragment key={`${word}-${wordIndex}`}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((char, charIndex) => (
                <span
                  key={charIndex}
                  data-scroll-letter=""
                  data-lit="false"
                  className="scroll-letter"
                >
                  {char}
                </span>
              ))}
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
