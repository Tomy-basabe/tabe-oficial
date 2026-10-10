import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { HeroSection } from "@/components/landing/HeroSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { ComicTicker } from "@/components/landing/ComicTicker";
import { ScrollStoryShowcase } from "@/components/landing/ScrollStoryShowcase";
import { ComicSuperpowersSection } from "@/components/landing/ComicSuperpowersSection";
import { ComicInteractiveDemo } from "@/components/landing/ComicInteractiveDemo";
import { EditorialManifestoSection } from "@/components/landing/EditorialManifestoSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MethodologySection } from "@/components/landing/MethodologySection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ComicEffectsProvider } from "@/components/comic/ComicEffectsProvider";
import { SmoothScrollProvider } from "@/components/landing/SmoothScrollProvider";

export default function Landing() {
  return (
    <SmoothScrollProvider>
      <ComicEffectsProvider>
        <div className="relative min-h-screen bg-background text-foreground selection:bg-[#1475e5]/20 selection:text-[#1475e5] overflow-x-hidden">
          {/* Rich Ambient & Comic Background */}
          <LandingBackground />

          <div className="relative z-10">
            <LandingNavbar />
            <HeroSection />
            <FinalCtaSection />
            <ComicTicker />
            <ScrollStoryShowcase />
            <ComicSuperpowersSection />
            <ComicInteractiveDemo />
            <EditorialManifestoSection />
            <ProblemSection />
            <MethodologySection />
            <HowItWorksSection />
            <TestimonialsSection />
            <FaqSection />
            <LandingFooter />
          </div>
        </div>
      </ComicEffectsProvider>
    </SmoothScrollProvider>
  );
}
