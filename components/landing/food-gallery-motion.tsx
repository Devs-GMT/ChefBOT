"use client";

import { useRef } from "react";

import { gsap, TOUCH } from "./motion/gsap";
import { useLandingMotion } from "./motion/use-landing-motion";

/**
 * Scroll motion for the painted food gallery. Rendered inside #pantry so
 * the gallery markup itself stays a server component (no hydration cost);
 * this attaches to its parent section.
 *
 * Desktop: as a chapter scrolls in, items drop onto the table (scrubbed,
 * deeper items later), then drift at different speeds for depth.
 * Phones: one pop-in per item, no scrub or parallax.
 */
export function FoodGalleryMotion() {
  const scope = useRef<HTMLElement | null>(null);

  useLandingMotion(scope, ({ desktop }) => {
    const root = scope.current!;
    const touch = window.matchMedia(TOUCH).matches;
    root.querySelectorAll<HTMLElement>("[data-chapter]").forEach((chapter) => {
      chapter.querySelectorAll<HTMLElement>("[data-art]").forEach((item, index) => {
        const depth = Number(item.dataset.depth ?? 0.5);
        const rotate = Number(item.dataset.rotate ?? 0);
        const drop = item.querySelector<HTMLElement>("[data-art-drop]")!;
        const from = {
          yPercent: 55 + depth * 45,
          rotate: rotate + (index % 2 ? 16 : -16),
          scale: 0.8,
          autoAlpha: 0,
        };
        const to = { yPercent: 0, rotate, scale: 1, autoAlpha: 1 };
        if (touch) {
          gsap.fromTo(drop, from, {
            ...to,
            duration: 0.9,
            delay: index * 0.07,
            ease: "back.out(1.5)",
            scrollTrigger: { trigger: chapter, start: "top 72%", once: true },
          });
          return;
        }
        gsap.fromTo(drop, from, {
          ...to,
          ease: "power3.out",
          scrollTrigger: {
            trigger: chapter,
            start: `top ${88 - depth * 10}%`,
            end: `top ${44 - depth * 10}%`,
            scrub: 0.8,
          },
        });
        if (desktop) {
          gsap.fromTo(
            item,
            { y: depth * 60 },
            {
              y: -depth * 90,
              ease: "none",
              scrollTrigger: { trigger: chapter, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }
      });
    });
  });

  return (
    <span
      hidden
      ref={(node) => {
        scope.current = node?.closest<HTMLElement>("#pantry") ?? null;
      }}
    />
  );
}
