/**
 * Intro + motion bootstrap for the landing page — pure and dependency-free
 * so it can run inline before first paint and be unit-tested.
 *
 * `html.motion`       — JS is running and motion is allowed: CSS may hide
 *                       `[data-anim]` elements until GSAP reveals them.
 * `html.intro-active` — first visit this session: the intro curtain plays.
 * `html.motion-ready` — set by the landing code once GSAP is running.
 *
 * Safety net: if `motion-ready` never appears (script error, blocked
 * chunk…), both classes are removed so the page is never left hidden.
 */

export const INTRO_SEEN_KEY = "chefbot-intro-seen";
/** Fired when the curtain starts lifting — the hero entrance begins. */
export const INTRO_REVEAL_EVENT = "chefbot:intro-reveal";
/** Fired when the intro has fully finished — scrolling resumes. */
export const INTRO_DONE_EVENT = "chefbot:intro-done";
/** Grace period for the landing code to start before content is un-hidden. */
export const MOTION_FALLBACK_MS = 6000;

export interface DeviceHints {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

/**
 * "Lite" devices skip the intro: the visitor asked to save data, or the
 * device reports ≤2 GB of memory. Unknown capabilities count as normal.
 */
export function isLiteDevice(hints: DeviceHints): boolean {
  if (hints.connection?.saveData) {
    return true;
  }
  return typeof hints.deviceMemory === "number" && hints.deviceMemory <= 2;
}

export function shouldPlayIntro({
  seen,
  reduced,
  lite,
}: {
  seen: boolean;
  reduced: boolean;
  lite: boolean;
}): boolean {
  return !seen && !reduced && !lite;
}

export const PREPAINT_SCRIPT = `(function(){try{var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("motion");var seen=false;try{seen=!!sessionStorage.getItem(${JSON.stringify(INTRO_SEEN_KEY)})}catch(e){}var n=navigator,c=n.connection,lite=!!(c&&c.saveData)||(typeof n.deviceMemory==="number"&&n.deviceMemory<=2);if(!seen&&!lite)d.classList.add("intro-active");setTimeout(function(){if(!d.classList.contains("motion-ready")){d.classList.remove("motion");d.classList.remove("intro-active")}},${MOTION_FALLBACK_MS})}catch(e){}})();`;
