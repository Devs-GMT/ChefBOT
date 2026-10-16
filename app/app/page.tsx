import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import { CookFlow } from "@/components/cook-flow";
import { Leaderboard } from "@/components/leaderboard";
import { MyKitchen } from "@/components/my-kitchen";
import { Reveal } from "@/components/reveal";
import { ScrollProgress } from "@/components/scroll-progress";
import { SectionTag } from "@/components/section-tag";
import { SiteFooter } from "@/components/site-footer";
import { WalletButton } from "@/components/wallet-button";

export const metadata: Metadata = {
  title: "ChefBOT Kitchen — Pick, cook, stamp.",
  description:
    "Pick your ingredients, get three recipes, and stamp every dish you cook on BOT Chain.",
};

export default function AppPage() {
  return (
    <div id="top" className="flex flex-1 flex-col">
      <ScrollProgress />
      <AppNav>
        <WalletButton />
      </AppNav>
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-2 sm:px-6">
          <Reveal effect="up">
            <SectionTag>The kitchen</SectionTag>
            <h1 className="mt-6 text-[clamp(2.5rem,6vw,64px)] leading-[0.96] font-bold tracking-normal text-ink">
              Pick. Cook. Stamp.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-[1.4] tracking-[-0.02em] text-brick">
              Everything below works without a wallet. Add MetaMask only when
              you want a dish written into your on-chain kitchen.
            </p>
          </Reveal>
        </section>

        <CookFlow />
        <Leaderboard />

        <Reveal effect="up">
          <MyKitchen />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}