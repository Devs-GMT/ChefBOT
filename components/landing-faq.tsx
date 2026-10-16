import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { SectionTag } from "@/components/section-tag";

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

export function LandingFaq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-24 border-t border-fog"
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
        <Reveal effect="up">
          <SectionTag>Straight answers</SectionTag>
          <h2
            id="faq-heading"
            className="mt-6 text-[clamp(2.5rem,6vw,96px)] leading-[0.96] font-bold tracking-normal text-ink"
          >
            FAQ
          </h2>
        </Reveal>

        <div className="mt-10">
          {FAQS.map((item, index) => (
            <Reveal
              key={item.question}
              effect="up"
              delay={Math.min(index * 80, 240)}
            >
              <details className="group border-b border-fog py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-medium text-ink transition-colors hover:text-brick sm:text-lg [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="font-mono text-ink transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pr-8 pb-4 leading-[1.5] tracking-[-0.02em] text-brick">
                  {item.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>

        <Reveal effect="up" delay={200}>
          <div className="band-dark mt-16 rounded-2xl bg-ink p-8 text-center sm:p-12">
            <h3 className="text-[clamp(1.75rem,4vw,48px)] leading-[0.96] font-bold tracking-normal text-parchment">
              Dinner, and a receipt.
            </h3>
            <p className="mx-auto mt-4 max-w-md text-base leading-[1.4] tracking-[-0.02em] text-parchment/70">
              Three recipes are waiting on what&apos;s in your kitchen right
              now.
            </p>
            <Link
              href="/app"
              className="mt-7 inline-flex min-h-12 items-center rounded-[40px] bg-parchment px-8 text-[15px] font-medium text-ink transition-colors hover:bg-white"
            >
              Start cooking
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}