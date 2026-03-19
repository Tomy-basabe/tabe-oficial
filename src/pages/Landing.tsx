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


function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    reveal();
                }
            },
            { threshold: 0.01, rootMargin: "0px 0px -50px 0px" }
        );

        const reveal = () => {
            if (!el.classList.contains("scroll-revealed")) {
                setTimeout(() => {
                    el.classList.add("scroll-revealed");
                }, delay);
                observer.disconnect();
            }
        };

        // Safety fallback: reveal after 1.5s if observer fails
        const fallback = setTimeout(reveal, 1500 + delay);

        observer.observe(el);
        return () => {
            observer.disconnect();
            clearTimeout(fallback);
        }
    }, [delay]);

    return (
        <div
            ref={ref}
            className={`scroll-reveal ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-neon-cyan/30 selection:text-neon-cyan">
            <LandingNavbar />

            <TabeAnimationSection />

            <HeroSection />

            <ScrollReveal delay={50}>
                <TestimonialsSection />
            </ScrollReveal>

            <AdsterraBanner />

            <ScrollReveal delay={50}>
                <FeaturesShowcase />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <ProblemSection />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <MethodologySection />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <SpecializationSection />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <HowItWorksSection />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <PricingSection />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <FaqSection />
            </ScrollReveal>

            <ScrollReveal delay={50}>
                <FinalCtaSection />
            </ScrollReveal>

            <ScrollReveal>
                <LandingFooter />
            </ScrollReveal>
        </div>
    );
}
