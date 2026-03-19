import { useEffect, useRef } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MethodologySection } from "@/components/landing/MethodologySection";
import { SpecializationSection } from "@/components/landing/SpecializationSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TabeAnimationSection } from "@/components/landing/TabeAnimationSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FeaturesShowcase } from "@/components/landing/FeaturesShowcase";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AdsterraBanner } from "@/components/ads/AdsterraBanner";


export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-neon-cyan/30 selection:text-neon-cyan">
            <LandingNavbar />

            <TabeAnimationSection />

            <HeroSection />

            <TestimonialsSection />
            <AdsterraBanner />
            <FeaturesShowcase />

            <ProblemSection />
            <MethodologySection />
            <SpecializationSection />
            <HowItWorksSection />
            <PricingSection />
            <FaqSection />
            <FinalCtaSection />
            <LandingFooter />
        </div>
    );
}
