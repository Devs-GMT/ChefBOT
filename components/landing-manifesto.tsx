import { Marquee } from "@/components/marquee";
import { Reveal } from "@/components/reveal";
import { SectionTag } from "@/components/section-tag";
import { StaggerText } from "@/components/stagger-text";

const TICKER = [
  "ChefBOT Kitchen Brief",
  "No. 001",
  "Real Food. Real Fast.",
  "Cooked on BOT Chain",
  "Chain ID 677",
  "Three recipes, always",
  "Stamped, not scrolled",
  "No signup",
];

/**
 * Second Press Ink band (DESIGN.md layout rhythm: parchment ↔ dark inverted),
 * with a telegraph-style mono ticker instead of decorative imagery.
 */
export function LandingManifesto() {
  return (
    <section
      aria-labelledby="manifesto-heading"
      className="band-dark w-full bg-ink py-6"
    >
      <Marquee
        items={TICKER}
        className="border-b border-parchment/10 py-5"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal effect="up">
          <SectionTag inverted>The manifesto</SectionTag>
        </Reveal>

        <h2
          id="manifesto-heading"
          className="mt-8 text-[clamp(2.5rem,7vw,115px)] leading-[0.9] font-bold tracking-normal text-parchment"
        >
          <StaggerText
            as="span"
            text="Recipe blogs bury the recipe."
            wordDelayMs={70}
          />
          <span className="mt-2 block">
            <StaggerText
              as="span"
              text="We bury the fluff."
              wordDelayMs={70}
              startDelayMs={400}
            />
          </span>
        </h2>

        <Reveal effect="up" delay={300}>
          <p className="mt-8 max-w-2xl text-[21px] leading-[1.2] tracking-[-0.02em] text-parchment/70">
            ChefBOT reads your pantry, hands you three recipes that fit the
            time you actually have, and lets you write the dish into BOT
            Chain when it&apos;s done. Food you&apos;ll cook tonight — plus a
            receipt that says you did.
          </p>
        </Reveal>
      </div>

      <Marquee
        items={TICKER}
        reverse
        className="border-t border-parchment/10 py-5"
      />
    </section>
  );
}