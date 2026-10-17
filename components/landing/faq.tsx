"use client";

import Link from "next/link";
import { useRef, type MouseEvent } from "react";

import { SectionTag } from "@/components/ui/section-tag";

import { EASE_OUT, gsap, MOTION_OK, TOUCH } from "./motion/gsap";
import { Magnetic } from "./motion/magnetic";
import { useLandingMotion } from "./motion/use-landing-motion";

const FAQS = [
  {
    question: "Do I need an account or a wallet?",
    answer:
      "No. Picking ingredients and reading recipes works with zero setup. A wallet (MetaMask on BOT Chain) is only needed when you want to stamp a dish you cooked.",
  },
  {
    question: "What happens if the AI is down?",
    answer:
      "Every request has an 8-second budget. If the AI worker times out, errors, or returns something malformed, ChefBOT serves curated House favourites from the local cookbook so you still get three recipes.",
  },
  {
    question: "What does the on-chain stamp actually prove?",
    answer:
      "It proves that your wallet recorded a claim that you cooked a given recipe — it does not physically verify the food. Think of it as a receipt for your kitchen ledger, not a kitchen inspection.",
  },
  {
    question: "Which network does ChefBOT use?",
    answer:
      "BOT Chain Mainnet (chain ID 677). The contract address and explorer link live in the footer, and leaderboard counts are read directly from the contract.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Browsing recipes is free. Stamping a dish is an ordinary on-chain transaction and costs a small amount of BOT for gas — you approve it in MetaMask before anything is sent.",
  },
];

/**
 * Smooth disclosure that keeps native <details> semantics: the summary
 * click is intercepted only to animate the answer's height open/closed.
 * Reduced motion falls back to the instant native toggle.
 */
function toggleSmoothly(event: MouseEvent<HTMLElement>) {
  const details = event.currentTarget.parentElement as HTMLDetailsElement;
  const answer = details.querySelector<HTMLElement>("[data-answer]");
  if (!answer || !window.matchMedia(MOTION_OK).matches) {
    return;
  }
  event.preventDefault();
  gsap.killTweensOf(answer);
  if (details.open) {
    gsap.to(answer, {
      height: 0,
      autoAlpha: 0,
      duration: 0.45,
      ease: "power3.inOut",
      onComplete: () => {
        details.open = false;
        gsap.set(answer, { clearProps: "height,opacity,visibility" });
      },
    });
  } else {
    details.open = true;
    gsap.fromTo(
      answer,
      { height: 0, autoAlpha: 0 },
      {
        height: "auto",
        autoAlpha: 1,
        duration: 0.55,
        ease: EASE_OUT,
        onComplete: () => {
          gsap.set(answer, { clearProps: "height" });
        },
      },
    );
  }
}

export function LandingFaq() {
  const scope = useRef<HTMLElement>(null);

  useLandingMotion(scope, () => {
    const root = scope.current!;
    gsap.from(root.querySelectorAll("[data-faq-item]"), {
      y: 30,
      autoAlpha: 0,
      duration: 0.8,
      ease: EASE_OUT,
      stagger: 0.07,
      scrollTrigger: { trigger: root.querySelector("[data-faq-list]"), start: "top 85%", once: true },
    });
    const cta = root.querySelector("[data-faq-cta]");
    const touch = window.matchMedia(TOUCH).matches;
    gsap.fromTo(
      cta,
      { scale: 0.86, borderRadius: 64 },
      touch
        ? { scale: 1, borderRadius: 28, duration: 1, ease: EASE_OUT, scrollTrigger: { trigger: cta, start: "top 90%", once: true } }
        : {
            scale: 1,
            borderRadius: 28,
            ease: "none",
            scrollTrigger: { trigger: cta, start: "top bottom", end: "center 60%", scrub: true },
          },
    );
  });

  return (
    <section
      ref={scope}
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24 border-t border-fog"
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-20 sm:px-6 lg:py-32">
        <div data-anim="fade-up">
          <SectionTag>Straight answers</SectionTag>
        </div>
        <h2
          id="faq-heading"
          data-anim="chars"
          className="mt-6 text-[clamp(2.5rem,6vw,96px)] leading-[0.96] font-bold tracking-[-0.035em] text-ink"
        >
          FAQ
        </h2>

        <div data-faq-list className="mt-10">
          {FAQS.map((item) => (
            <details key={item.question} data-faq-item className="group border-b border-fog py-1">
              <summary
                onClick={toggleSmoothly}
                className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[19px] leading-[1.2] font-medium tracking-[-0.019em] text-ink transition-colors hover:text-alert [&::-webkit-details-marker]:hidden"
              >
                {item.question}
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-fog font-mono text-ink transition-[transform,background-color,color] duration-500 group-open:rotate-[135deg] group-open:bg-ink group-open:text-white"
                >
                  +
                </span>
              </summary>
              <div data-answer className="overflow-hidden">
                <p className="max-w-3xl pr-8 pb-5 leading-[1.5] tracking-[-0.02em] text-brick">
                  {item.answer}
                </p>
              </div>
            </details>
          ))}
        </div>

        <div
          data-faq-cta
          className="band-dark mt-16 overflow-hidden rounded-[28px] bg-ink p-8 text-center sm:p-14"
        >
          <h3
            data-anim="lines"
            className="text-[clamp(2rem,5vw,64px)] leading-[0.94] font-bold tracking-[-0.035em] text-parchment"
          >
            Dinner, and a receipt.
          </h3>
          <p className="mx-auto mt-4 max-w-md text-base leading-[1.4] tracking-[-0.02em] text-parchment/80">
            Three recipes are waiting on what&apos;s in your kitchen right now.
          </p>
          <Magnetic className="mt-8">
            <Link
              href="/app"
              className="inline-flex min-h-14 items-center gap-3 rounded-full bg-parchment py-2 pr-6 pl-2 text-base font-medium text-ink transition-colors hover:bg-white"
            >
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full bg-ink text-parchment"
              >
                <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5" fill="currentColor">
                  <path d="M4 2.5v11l9-5.5z" />
                </svg>
              </span>
              Start cooking
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
