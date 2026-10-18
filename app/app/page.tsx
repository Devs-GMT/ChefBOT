import type { Metadata } from "next";
import Image from "next/image";

import { AppNav } from "@/components/kitchen/app-nav";
import { CookFlow } from "@/components/kitchen/cook-flow";
import { KitchenTabs } from "@/components/kitchen/kitchen-tabs";
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
        <section className="mx-auto w-full max-w-6xl px-4 pt-8 pb-6 sm:px-6 lg:pt-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs tracking-[0.06em] text-brick uppercase">
                The kitchen · no signup
              </p>
              <h1 className="mt-3 text-[clamp(2.75rem,7vw,96px)] leading-[0.86] font-bold tracking-[-0.04em] text-ink">
                <StaggerText as="span" text="Pick. Cook." />{" "}
                <StaggerText as="span" text="Stamp." className="text-alert" startDelayMs={160} />
              </h1>
            </div>
            <Reveal effect="up" delay={200} className="flex items-end gap-5">
              <p className="max-w-xs text-[17px] leading-[1.3] tracking-[-0.02em] text-ink">
                Works without a wallet. Add MetaMask only to stamp a dish into
                your on-chain kitchen.
              </p>
              <div className="hidden shrink-0 gap-2 sm:flex">
                {STRIP.map((photo, index) => (
                  <div
                    key={photo.alt}
                    className={`relative aspect-[3/4] w-16 overflow-hidden rounded-xl bg-wheat lg:w-20 ${
                      index === 1 ? "-translate-y-2" : ""
                    }`}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      placeholder="blur"
                      sizes="80px"
                      className="h-full w-full object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <KitchenTabs
          panels={{
            cook: <CookFlow />,
            "shopping-list": <ShoppingList />,
            "my-recipes": <MyRecipes />,
            "most-cooked": <Leaderboard />,
            "my-kitchen": <MyKitchen />,
          }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
