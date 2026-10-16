import { Reveal } from "@/components/reveal";
import { SectionTag } from "@/components/section-tag";

const STEPS = [
  {
    number: "01",
    title: "Open the pantry",
    body: "Tap at least two ingredients from your kitchen, pick 10, 20, or 30 minutes, and flip the vegetarian switch if you want it.",
  },
  {
    number: "02",
    title: "Take three recipes",
    body: "ChefBOT returns exactly three dishes that fit what you have. Missing ingredients show up in red before you commit.",
  },
  {
    number: "03",
    title: "Stamp the receipt",
    body: "Cooked it? Hit the stamp, approve in MetaMask, and the dish lands in your kitchen and the leaderboard on BOT Chain.",
  },
];

export function LandingHow() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="scroll-mt-24 border-t border-fog"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal effect="up">
          <SectionTag>Three steps, no signup</SectionTag>
          <h2
            id="how-heading"
            className="mt-6 max-w-2xl text-[clamp(2.5rem,6vw,96px)] leading-[0.96] font-bold tracking-normal text-ink"
          >
            How it works
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-8 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.number}
              effect="up"
              delay={index * 150}
              as="li"
              className="border-t border-ink pt-6"
            >
              <p className="font-mono text-xs tracking-[0.06em] text-ink">
                {step.number}
              </p>
              <h3 className="mt-4 text-[33px] leading-[1.04] font-bold tracking-[-0.019em] text-ink">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-[1.4] tracking-[-0.02em] text-brick">
                {step.body}
              </p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}