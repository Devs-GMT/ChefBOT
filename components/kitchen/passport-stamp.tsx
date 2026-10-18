import type { CSSProperties } from "react";

import type { MyKitchenEntry } from "@/lib/queries";

/** A stable tilt from -8° to 8° per dish key, so a stamp never wobbles on re-render. */
export function stampTilt(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 17) - 8;
}

/**
 * Shared SVG defs for every stamp on a page: the arcs the ring text runs
 * along and a rough "rubber ink" edge. Rendered once, referenced by id.
 */
export function StampDefs({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <path id={`${id}-top`} d="M 22 60 A 38 38 0 0 1 98 60" />
        <path id={`${id}-bottom`} d="M 18 60 A 42 42 0 0 0 102 60" />
        <filter id={`${id}-ink`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
      </defs>
    </svg>
  );
}

const TINTS = ["#d50000", "#110000", "#8a1c1c"] as const;

/** One circular rubber stamp: ink rings, ring text, the dish emoji in the middle. */
export function PassportStamp({
  entry,
  number,
  defsId,
  delay,
}: {
  entry: MyKitchenEntry;
  number: number;
  defsId: string;
  delay: number;
}) {
  const tilt = stampTilt(entry.key);
  const ink = TINTS[Math.abs(tilt) % TINTS.length];
  const style = { "--tilt": `${tilt}deg`, animationDelay: `${delay}ms` } as CSSProperties;
  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        className="stamp-thunk w-full max-w-[132px] opacity-90 mix-blend-multiply"
        style={style}
      >
        <g filter={`url(#${defsId}-ink)`} fill="none" stroke={ink}>
          <circle cx="60" cy="60" r="56" strokeWidth="3.5" />
          <circle cx="60" cy="60" r="51" strokeWidth="1.2" />
          <circle cx="60" cy="60" r="30" strokeWidth="1.2" strokeDasharray="2 3" />
        </g>
        <g fill={ink} className="font-mono" fontSize="9" letterSpacing="1.5">
          <text>
            <textPath href={`#${defsId}-top`} startOffset="50%" textAnchor="middle">
              COOKED · BOT CHAIN
            </textPath>
          </text>
          <text dominantBaseline="hanging">
            <textPath href={`#${defsId}-bottom`} startOffset="50%" textAnchor="middle">
              {`№ ${String(number).padStart(2, "0")} · ${entry.cooks} COOK${entry.cooks === 1 ? "" : "S"}`}
            </textPath>
          </text>
        </g>
        <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontSize="30">
          {entry.emoji}
        </text>
      </svg>
      <p className="mt-2 line-clamp-2 text-[13px] leading-tight font-bold tracking-[-0.01em] text-ink">
        {entry.title}
      </p>
      <p className="mt-0.5 font-mono text-[11px] tracking-[0.04em] text-alert">
        {entry.cooks} cook{entry.cooks === 1 ? "" : "s"}
      </p>
    </li>
  );
}
