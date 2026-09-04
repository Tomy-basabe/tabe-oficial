import { useEffect, useRef } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MethodologySection } from "@/components/landing/MethodologySection";
import { SpecializationSection } from "@/components/landing/SpecializationSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { LandingFooter } from "@/components/landing/LandingFooter";


export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-[#1475e5]/20 selection:text-[#1475e5]">
            <LandingNavbar />

            <HeroSection />
            <FinalCtaSection />

            <TestimonialsSection />
            <ProblemSection />
            <MethodologySection />
            <SpecializationSection />
            <HowItWorksSection />
            <FaqSection />
            <LandingFooter />
        </div>
    );
}
