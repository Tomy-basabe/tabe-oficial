import { useEffect, useState, useRef } from "react";

export function TabeAnimationSection() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            // Use simpler calculation: how far has user scrolled relative to section height
            const scrollTop = window.scrollY;
            const sectionHeight = containerRef.current.offsetHeight;
            // Progress goes from 0 (top) to 1 (scrolled past section)
            const progress = Math.max(0, Math.min(1, scrollTop / (sectionHeight * 0.6)));
            setScrollProgress(progress);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const letters = [
        { letter: "T", word: "Tomas" },
        { letter: "A", word: "Aprendizaje" },
        { letter: "B", word: "Basado en" },
        { letter: "E", word: "Experiencia" },
    ];

    // Letters fade out fast between 0.0 and 0.4
    // Tagline appears between 0.5 and 0.7
    // Everything gone by 0.9

    return (
        <section
            ref={containerRef}
            className="relative bg-foreground text-background"
            style={{ height: '130vh' }}
        >
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">

                {/* Background glow */}
                <div
                    className="absolute top-1/2 left-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 blur-[120px] mix-blend-screen pointer-events-none"
                    style={{
                        transform: `translate(-50%, -50%) scale(${1 + scrollProgress * 0.5})`,
                        opacity: scrollProgress > 0.8 ? Math.max(0, 1 - (scrollProgress - 0.8) * 5) : 0.6,
                    }}
                />

                {/* Letters - visible on load via CSS, fade out on scroll */}
                <div
                    className="container px-4 relative z-10"
                    style={{
                        opacity: scrollProgress < 0.3 ? 1 : Math.max(0, 1 - (scrollProgress - 0.3) * 5),
                        transform: `scale(${1 + scrollProgress * 0.15}) translateY(${-scrollProgress * 30}px)`,
                        filter: `blur(${scrollProgress > 0.3 ? (scrollProgress - 0.3) * 15 : 0}px)`,
                        transition: 'filter 0.1s',
                    }}
                >
                    <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 lg:gap-20">
                        {letters.map((item, index) => (
                            <div
                                key={index}
                                className="flex flex-col items-center animate-fade-in-up"
                                style={{
                                    animationDelay: `${index * 120}ms`,
                                    animationFillMode: 'both',
                                }}
                            >
                                <span className="text-7xl md:text-9xl lg:text-[11rem] font-display font-black bg-gradient-to-br from-neon-cyan via-white to-neon-purple text-transparent bg-clip-text leading-none">
                                    {item.letter}
                                </span>
                                <span className="text-base md:text-xl lg:text-2xl font-bold mt-2 md:mt-3 tracking-[0.3em] text-background/50 uppercase">
                                    {item.word}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tagline - appears only after letters are completely gone */}
                <div
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                    style={{
                        opacity: scrollProgress > 0.55 ? Math.min(1, (scrollProgress - 0.55) * 5) : 0,
                        transform: `translateY(${scrollProgress > 0.55 ? 0 : 20}px)`,
                        transition: 'transform 0.2s ease-out',
                    }}
                >
                    <div className="text-center px-6">
                        <p className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-white leading-tight">
                            No es un curso.
                            <br />
                            Es un <span className="bg-gradient-to-r from-neon-cyan to-neon-purple text-transparent bg-clip-text">ecosistema</span>.
                        </p>
                    </div>
                </div>

            </div>
        </section>
    );
}
