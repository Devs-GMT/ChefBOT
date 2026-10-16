import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { SectionTag } from "@/components/section-tag";
import { StaggerText } from "@/components/stagger-text";

const PROOF = ["3 recipes every time", "No signup", "Receipts on BOT Chain"];

/**
 * DESIGN.md "Dark Hero Band": full-bleed Press Ink opening with a centered
 * display headline (170px / 0.84 line-height at the top of the clamp).
 * Purely typographic — no decorative imagery.
 */
export function LandingHero() {
  return (
    <section className="band-dark w-full bg-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 lg:pt-28 lg:pb-24">
        <Reveal effect="up">
          <SectionTag inverted>Cooked on BOT Chain</SectionTag>
        </Reveal>

        <h1 className="mt-8 text-[clamp(3.25rem,11vw,170px)] leading-[0.84] font-bold tracking-normal text-parchment">
          <StaggerText
            as="span"
            text="Real Food."
            className="block"
            startDelayMs={80}
          />
          <StaggerText
            as="span"
            text="Real Fast."
            className="block"
            startDelayMs={340}
          />
        </h1>

        <Reveal effect="up" delay={520}>
          <p className="mt-8 max-w-[600px] text-[21px] leading-[1.2] tracking-[-0.02em] text-parchment/70">
            Tell ChefBOT what is in your kitchen. Get three practical recipes
            in seconds — then stamp every dish you actually cook on-chain. No
            fluff, no five-paragraph stories. Just dinner, and a receipt.
          </p>
        </Reveal>

        <Reveal effect="up" delay={640}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/app"
              className="inline-flex min-h-12 items-center rounded-[40px] bg-parchment px-6 text-[15px] font-medium text-ink transition-colors hover:bg-white"
            >
              Start cooking
            </Link>
            <a
              href="#how"
              className="inline-flex min-h-12 items-center rounded-[40px] border-[1.5px] border-parchment/40 px-6 text-[15px] font-medium text-parchment transition-colors hover:border-parchment"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal effect="up" delay={760}>
          <ul className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {PROOF.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 font-mono text-xs tracking-[0.06em] text-parchment/60 uppercase"
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-parchment/60"
                />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
