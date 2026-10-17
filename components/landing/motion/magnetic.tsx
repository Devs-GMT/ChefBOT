"use client";

import { useRef, type ReactNode } from "react";

import { gsap, MOTION_OK, useGSAP } from "./gsap";

/**
 * Magnetic hover: the child drifts toward the pointer while it is over the
 * wrapper and springs back on leave. Pointer-only (fine pointers), and off
 * under reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const node = ref.current;
      if (
        !node ||
        !window.matchMedia(`${MOTION_OK} and (pointer: fine)`).matches
      ) {
        return;
      }
      const xTo = gsap.quickTo(node, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(node, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const onMove = (event: PointerEvent) => {
        const rect = node.getBoundingClientRect();
        xTo((event.clientX - (rect.left + rect.width / 2)) * strength);
        yTo((event.clientY - (rect.top + rect.height / 2)) * strength);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerleave", onLeave);
      return () => {
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children}
    </span>
  );
}
