import { Fragment, type ElementType } from "react";

import { Reveal } from "@/components/reveal";

export interface StaggerTextProps {
  /** Full sentence. It is split on spaces into per-word spans. */
  text: string;
  /** Styles for the outer heading element. */
  className?: string;
  /** Extra styles for the reveal wrapper. */
  revealClassName?: string;
  /** Delay between each word, in milliseconds. */
  wordDelayMs?: number;
  /** Delay before the first word, in milliseconds. */
  startDelayMs?: number;
  /** Heading tag to render. Defaults to p. */
  as?: ElementType;
}

/**
 * Editorial headline that reveals word by word when scrolled into view.
 * Each word is an inline-block span; spaces stay as normal text nodes so
 * lines wrap naturally.
 */
export function StaggerText({
  text,
  className = "",
  revealClassName = "",
  wordDelayMs = 55,
  startDelayMs = 0,
  as,
}: StaggerTextProps) {
  const Tag = (as ?? "p") as "p";
  const words = text.split(" ");

  return (
    <Tag className={className}>
      <Reveal
        as="span"
        effect="fade"
        delay={startDelayMs}
        className={`block ${revealClassName}`}
      >
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <span
              className="reveal-word"
              style={{ transitionDelay: `${index * wordDelayMs}ms` }}
            >
              {word}
            </span>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </Reveal>
    </Tag>
  );
}