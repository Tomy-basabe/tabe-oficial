import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { HeroSection } from "@/components/landing/HeroSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { ComicTicker } from "@/components/landing/ComicTicker";
import { ComicInteractiveDemo } from "@/components/landing/ComicInteractiveDemo";
import { ComicSuperpowersSection } from "@/components/landing/ComicSuperpowersSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MethodologySection } from "@/components/landing/MethodologySection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ComicEffectsProvider } from "@/components/comic/ComicEffectsProvider";

export default function Landing() {
  return (
    <ComicEffectsProvider>
      <div className="relative min-h-screen bg-background text-foreground selection:bg-[#1475e5]/20 selection:text-[#1475e5] overflow-x-hidden">
        {/* Rich Ambient & Comic Background */}
        <LandingBackground />

        <div className="relative z-10">
          <LandingNavbar />
          <HeroSection />
          <FinalCtaSection />
          <ComicTicker />
          <ComicInteractiveDemo />
          <ComicSuperpowersSection />
          <ProblemSection />
          <MethodologySection />
          <HowItWorksSection />
          <TestimonialsSection />
          <FaqSection />
          <LandingFooter />
        </div>
      </div>
    </ComicEffectsProvider>
  );
}
