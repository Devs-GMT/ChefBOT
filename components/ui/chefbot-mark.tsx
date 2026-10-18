/**
 * The ChefBOT mark: a chef's hat on a little bot head. The eyes and the
 * mouth are real holes in the head (even-odd fill), so the mark works on
 * any background; the red "light" sits in the mouth. Ink parts use
 * `currentColor` — parchment on the dark nav, ink on cream.
 *
 * Shapes live here once; app/icon.svg, the Apple icon and the share image
 * are built from the same constants (tests/chefbot-mark.test.tsx guards it).
 */

export const MARK_RED = "#d50000";
export const MARK_INK = "#110000";
export const MARK_PAPER = "#fdfbee";

/** Hat: three puffs on a straight band. */
export const MARK_PUFFS = [
  { cx: 21, cy: 16, r: 8 },
  { cx: 32, cy: 12, r: 10 },
  { cx: 43, cy: 16, r: 8 },
] as const;
export const MARK_BAND = { x: 17, y: 17, width: 30, height: 10, rx: 2 } as const;

/** Rounded head with two eye holes and a mouth hole (fill-rule: evenodd). */
export const MARK_HEAD_PATH =
  "M21 30H43A11 11 0 0 1 54 41V49A11 11 0 0 1 43 60H21A11 11 0 0 1 10 49V41A11 11 0 0 1 21 30Z" +
  "M18.6 43a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0Z" +
  "M36.6 43a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0Z" +
  "M27 52a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z";

/** The red light inside the mouth hole. */
export const MARK_DOT = { cx: 32, cy: 52, r: 3.4 } as const;

/** SVG markup (inside a 64×64 viewBox) for places without React DOM: icon files, OG image. */
export function markSvgBody(ink: string): string {
  const puffs = MARK_PUFFS.map((p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}"/>`).join("");
  const b = MARK_BAND;
  return (
    `<g fill="${ink}">${puffs}<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="${b.rx}"/>` +
    `<path fill-rule="evenodd" d="${MARK_HEAD_PATH}"/></g>` +
    `<circle cx="${MARK_DOT.cx}" cy="${MARK_DOT.cy}" r="${MARK_DOT.r}" fill="${MARK_RED}"/>`
  );
}

/** The app icon: ink mark on a parchment rounded tile (readable on light and dark tabs). */
export function markIconSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${MARK_PAPER}"/>` +
    `<g transform="translate(3.84 4.7) scale(.88)">${markSvgBody(MARK_INK)}</g></svg>`
  );
}

/** The mark as a data URI, for `next/og` ImageResponse `<img>` sources. */
export function markDataUri(ink: string = MARK_INK): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${markSvgBody(ink)}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ChefBotMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      <g fill="currentColor">
        {MARK_PUFFS.map((p) => (
          <circle key={p.cx} cx={p.cx} cy={p.cy} r={p.r} />
        ))}
        <rect {...MARK_BAND} />
        <path fillRule="evenodd" d={MARK_HEAD_PATH} />
      </g>
      <circle {...MARK_DOT} fill={MARK_RED} data-mark-light="" />
    </svg>
  );
}
