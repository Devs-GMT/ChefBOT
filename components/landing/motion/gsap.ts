"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Single registration point for every GSAP plugin the landing page uses.
 * Import GSAP from here (never straight from "gsap") so plugins are always
 * registered before a component builds its timelines.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);
  // Mobile browser chrome showing/hiding must not re-measure every pin.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** Motion is allowed (respects the OS "reduce motion" setting). */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
/** Viewports wide enough for pinned, scrubbed scenes. */
export const DESKTOP = "(min-width: 1024px)";
/** Touch-first devices: native scrolling, lighter per-frame work. */
export const TOUCH = "(pointer: coarse)";
/** Mouse/trackpad devices — the only ones that get Lenis smoothing. */
export const FINE_POINTER = "(pointer: fine)";

/** House easing — long, soft settles (expo-out), used across the page. */
export const EASE_OUT = "expo.out";
export const EASE_IN_OUT = "expo.inOut";

export { DrawSVGPlugin, gsap, ScrollTrigger, SplitText, useGSAP };
