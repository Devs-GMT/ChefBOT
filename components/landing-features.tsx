import { Reveal } from "@/components/reveal";
import { SectionTag } from "@/components/section-tag";

const FEATURES = [
  {
    title: "Recipes that respect the clock",
    body: "10, 20, or 30 minutes in, three complete recipes out — each with steps short enough to actually follow while the pan heats.",
  },
  {
    title: "AI with a real fallback",
    body: "If the AI worker times out or hiccups, curated House favourites from the local cookbook serve you instead. The flow never dead-ends.",
  },
  {
    title: "Your ledger, on-chain",
    body: "Every \"I cooked it\" stamp is a transaction on BOT Chain. Leaderboard counts come from the contract — never from local guesswork.",
  },
  {
    title: "Pantry gaps, shown early",
    body: "Before you start chopping, missing ingredients are flagged in red on every card. No surprise runs to the store mid-recipe.",
  },
];

export function LandingFeatures() {
  return (
    <section aria-labelledby="features-heading">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal effect="up">
          <SectionTag>Why ChefBOT</SectionTag>
          <h2
            id="features-heading"
            className="mt-6 max-w-4xl text-[clamp(2.5rem,6vw,80px)] leading-[0.96] font-bold tracking-normal text-ink"
          >
            Built for people who are already hungry
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              effect={index % 2 === 0 ? "left" : "right"}
              delay={(index % 2) * 120}
              className="rounded-2xl bg-paper p-6 shadow-card transition-transform duration-300 hover:-translate-y-1 sm:p-8"
            >
              <h3 className="text-[33px] leading-[1.04] font-bold tracking-[-0.019em] text-ink">
                {feature.title}
              </h3>
              <p className="mt-4 text-base leading-[1.4] tracking-[-0.02em] text-brick">
                {feature.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}