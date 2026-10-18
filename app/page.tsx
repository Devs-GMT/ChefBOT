import { LandingFaq } from "@/components/landing/faq";
import { LandingFeatures } from "@/components/landing/features";
import { LandingFoodGallery } from "@/components/landing/food-gallery";
import { LandingFoodGroups } from "@/components/landing/food-groups";
import { LandingHero } from "@/components/landing/hero";
import { LandingHow } from "@/components/landing/how-it-works";
import { IntroCurtain } from "@/components/landing/intro/intro-curtain";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingManifesto } from "@/components/landing/manifesto";
import { SmoothScroll } from "@/components/landing/motion/smooth-scroll";
import { LandingStats } from "@/components/landing/stats";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { SiteFooter } from "@/components/ui/site-footer";

export default function Home() {
  return (
    <SmoothScroll>
      <div id="top" className="flex flex-1 flex-col">
        <IntroCurtain />
        <ScrollProgress />
        <LandingNav />
        <main className="flex-1">
          <LandingHero />
          <LandingStats />
          <LandingFoodGroups />
          <LandingFoodGallery />
          <LandingManifesto />
          <LandingHow />
          <LandingFeatures />
          <LandingFaq />
        </main>
        <SiteFooter />
      </div>
    </SmoothScroll>
  );
}
