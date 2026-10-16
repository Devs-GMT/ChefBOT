import { LandingFaq } from "@/components/landing-faq";
import { LandingFeatures } from "@/components/landing-features";
import { LandingHero } from "@/components/landing-hero";
import { LandingHow } from "@/components/landing-how";
import { LandingManifesto } from "@/components/landing-manifesto";
import { LandingNav } from "@/components/landing-nav";
import { LandingStats } from "@/components/landing-stats";
import { ScrollProgress } from "@/components/scroll-progress";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <div id="top" className="flex flex-1 flex-col">
      <ScrollProgress />
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingStats />
        <LandingManifesto />
        <LandingHow />
        <LandingFeatures />
        <LandingFaq />
      </main>
      <SiteFooter />
    </div>
  );
}
