import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MethodologySection } from "@/components/landing/MethodologySection";
import { SpecializationSection } from "@/components/landing/SpecializationSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TabeAnimationSection } from "@/components/landing/TabeAnimationSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-neon-cyan/30 selection:text-neon-cyan overflow-x-hidden">
            <LandingNavbar />
            <TabeAnimationSection />
            <HeroSection />
            <ProblemSection />
            <MethodologySection />
            <SpecializationSection />
            <HowItWorksSection />
            <TestimonialsSection />
            <PricingSection />
            <FaqSection />
            <FinalCtaSection />
            <LandingFooter />
        </div>
    );
}
