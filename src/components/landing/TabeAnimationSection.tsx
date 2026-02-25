import { useEffect, useState, useRef } from "react";

export function TabeAnimationSection() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            const totalScrollable = rect.height + windowHeight;
            const scrolled = windowHeight - rect.top;

            let progress = scrolled / totalScrollable;
            progress = Math.max(0, Math.min(1, progress));
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

    // Phase 1: Letters appear (progress 0.15 - 0.45)
    // Phase 2: Letters hold (progress 0.45 - 0.55)
    // Phase 3: Letters fade out + tagline fades in (progress 0.55 - 0.75)
    // Phase 4: Everything fades out (progress 0.75 - 0.9)

    const lettersVisible = scrollProgress < 0.75;
    const taglineOpacity = scrollProgress > 0.55 && scrollProgress < 0.85
        ? Math.min(1, (scrollProgress - 0.55) * 5)
        : scrollProgress >= 0.85
            ? Math.max(0, 1 - (scrollProgress - 0.85) * 7)
            : 0;

    return (
        <section
            ref={containerRef}
            className="relative min-h-[200vh] bg-foreground text-background"
        >
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">

                {/* Animated Background Orb */}
                <div
                    className="absolute top-1/2 left-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-gradient-to-br from-neon-cyan/25 to-neon-purple/25 blur-[150px] mix-blend-screen pointer-events-none"
                    style={{
                        transform: `translate(-50%, -50%) scale(${0.3 + scrollProgress * 1.8}) rotate(${scrollProgress * 60}deg)`,
                        opacity: scrollProgress > 0.85 ? 0 : Math.min(0.8, scrollProgress * 2),
                    }}
                />

                {/* Letters Phase */}
                {lettersVisible && (
                    <div className="container px-4 relative z-10">
                        <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 lg:gap-20">
                            {letters.map((item, index) => {
                                const appearStart = 0.15 + index * 0.07;
                                const appearEnd = appearStart + 0.10;

                                let opacity = 0;
                                let yOffset = 60;
                                let scale = 0.6;
                                let blur = 8;

                                if (scrollProgress >= appearStart) {
                                    const localProgress = Math.min(1, (scrollProgress - appearStart) / (appearEnd - appearStart));
                                    const eased = 1 - Math.pow(1 - localProgress, 3);
                                    opacity = eased;
                                    yOffset = 60 * (1 - eased);
                                    scale = 0.6 + 0.4 * eased;
                                    blur = 8 * (1 - eased);
                                }

                                // Fade out for tagline
                                if (scrollProgress > 0.55) {
                                    const fadeOut = Math.max(0, 1 - (scrollProgress - 0.55) * 3);
                                    opacity *= fadeOut;
                                }

                                return (
                                    <div
                                        key={index}
                                        className="flex flex-col items-center"
                                        style={{
                                            opacity,
                                            transform: `translateY(${yOffset}px) scale(${scale})`,
                                            filter: `blur(${blur}px)`,
                                            willChange: 'transform, opacity, filter',
                                        }}
                                    >
                                        <span className="text-7xl md:text-9xl lg:text-[11rem] font-display font-black bg-gradient-to-br from-neon-cyan via-white to-neon-purple text-transparent bg-clip-text leading-none drop-shadow-[0_0_40px_rgba(0,255,170,0.25)]">
                                            {item.letter}
                                        </span>
                                        <span className="text-base md:text-xl lg:text-2xl font-bold mt-2 md:mt-4 tracking-[0.3em] text-background/60 uppercase">
                                            {item.word}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tagline Phase - only shows AFTER letters fade */}
                <div
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                    style={{
                        opacity: taglineOpacity,
                        transform: `translateY(${taglineOpacity > 0 ? 0 : 30}px)`,
                        transition: 'transform 0.4s ease-out'
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
