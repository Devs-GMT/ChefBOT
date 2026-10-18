import type { Metadata } from "next";
import Image from "next/image";

import { AppNav } from "@/components/kitchen/app-nav";
import { CookFlow } from "@/components/kitchen/cook-flow";
import { Leaderboard } from "@/components/kitchen/leaderboard";
import { MyKitchen } from "@/components/kitchen/my-kitchen";
import { Reveal } from "@/components/ui/reveal";
import { MyRecipes } from "@/components/kitchen/my-recipes";
import { ShoppingList } from "@/components/kitchen/shopping-list";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { SiteFooter } from "@/components/ui/site-footer";
import { StaggerText } from "@/components/ui/stagger-text";
import { WalletButton } from "@/components/kitchen/wallet-button";
import poke from "@/public/food/poke-bowl.jpg";
import ramen from "@/public/food/ramen.jpg";
import salmon from "@/public/food/salmon-plate.jpg";

export const metadata: Metadata = {
  title: "ChefBOT Kitchen — Pick, cook, stamp.",
  description:
    "Pick your ingredients, get three recipes, and stamp every dish you cook on BOT Chain.",
};

const STEPS = [
  { href: "#cook", number: "01", label: "Pick your fridge" },
  { href: "#cook", number: "02", label: "Get 3 recipes" },
  { href: "#most-cooked", number: "03", label: "Stamp on BOT Chain" },
];

const STRIP = [
  { src: ramen, alt: "A bowl of ramen with a soft egg and spring onion." },
  { src: poke, alt: "A salmon poke bowl with avocado and edamame." },
  { src: salmon, alt: "Glazed salmon with rice, green beans and tomatoes." },
];

export default function AppPage() {
  return (
    <div id="top" className="flex flex-1 flex-col">
      <ScrollProgress />
      <AppNav>
        <WalletButton tone="dark" />
      </AppNav>
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:pt-14">
          <div className="grid items-end gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="font-mono text-xs tracking-[0.06em] text-brick uppercase">
                The kitchen · no signup
              </p>
              <h1 className="mt-4 text-[clamp(3rem,9vw,128px)] leading-[0.84] font-bold tracking-[-0.04em] text-ink">
                <StaggerText as="span" text="Pick." className="block" />
                <StaggerText as="span" text="Cook." className="block" startDelayMs={120} />
                <StaggerText
                  as="span"
                  text="Stamp."
                  className="block text-alert"
                  startDelayMs={240}
                />
              </h1>
            </div>
            <Reveal effect="up" delay={200}>
              <p className="max-w-md text-[19px] leading-[1.3] tracking-[-0.02em] text-ink">
                Everything below works without a wallet. Add MetaMask only when
                you want a dish written into your on-chain kitchen.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {STRIP.map((photo, index) => (
                  <div
                    key={photo.alt}
                    className={`relative aspect-[3/4] overflow-hidden rounded-2xl bg-wheat ${
                      index === 1 ? "translate-y-4" : ""
                    }`}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      placeholder="blur"
                      sizes="(min-width: 1024px) 160px, 30vw"
                      className="h-full w-full object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <ol className="mt-12 grid grid-cols-3 border-y border-ink">
            {STEPS.map((step, index) => (
              <li
                key={step.number}
                className={index > 0 ? "border-l border-fog" : undefined}
              >
                <a
                  href={step.href}
                  className="flex h-full min-h-16 flex-col justify-center gap-1 px-2 py-3 transition-colors hover:bg-wheat sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4"
                >
                  <span className="font-mono text-xs text-alert tabular-nums">
                    {step.number}
                  </span>
                  <span className="text-sm leading-tight font-medium text-ink sm:text-base">
                    {step.label}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <CookFlow />
        <ShoppingList />
        <MyRecipes />
        <Leaderboard />

        <Reveal effect="up">
          <MyKitchen />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
