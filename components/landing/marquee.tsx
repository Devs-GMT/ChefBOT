export interface MarqueeProps {
  /** Visible items shown once per group. */
  items: string[];
  className?: string;
  /** Scroll direction. Defaults to left. */
  reverse?: boolean;
}

/**
 * Infinite horizontal ticker. The track holds two identical groups so the
 * -50% keyframe loops seamlessly. Decorative: the duplicate copy is hidden
 * from assistive technology and the animation stops under reduced motion.
 */
export function Marquee({ items, className = "", reverse = false }: MarqueeProps) {
  return (
    <div
      aria-hidden="true"
      className={`marquee ${reverse ? "marquee--reverse" : ""} ${className}`}
    >
      <div className="marquee__track">
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee__group">
            {items.map((item) => (
              <span
                key={item}
                className="flex items-center gap-3 px-6 font-mono text-xs tracking-[0.06em] uppercase whitespace-nowrap text-parchment/60"
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-parchment/40"
                />
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}