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

    return (
        <section
            ref={containerRef}
            className="relative min-h-[150vh] bg-foreground text-background"
        >
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">

                {/* Animated Background Orbs */}
                <div
                    className="absolute top-1/2 left-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 blur-[150px] mix-blend-screen"
                    style={{
                        transform: `translate(-50%, -50%) scale(${0.3 + scrollProgress * 2}) rotate(${scrollProgress * 90}deg)`,
                        opacity: scrollProgress > 0.85 ? Math.max(0, 1 - (scrollProgress - 0.85) * 7) : Math.min(1, scrollProgress * 3),
                    }}
                />
                <div
                    className="absolute top-1/3 right-1/4 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full bg-gradient-to-tr from-neon-gold/20 to-neon-cyan/10 blur-[100px] mix-blend-screen"
                    style={{
                        transform: `translate(${scrollProgress * 100}px, ${-scrollProgress * 50}px) scale(${0.5 + scrollProgress})`,
                        opacity: scrollProgress > 0.85 ? 0 : scrollProgress * 0.8,
                    }}
                />

                {/* Particle lines */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent"
                            style={{
                                width: `${40 + i * 10}%`,
                                top: `${15 + i * 14}%`,
                                left: `${-20 + scrollProgress * (40 + i * 5)}%`,
                                opacity: scrollProgress > 0.1 && scrollProgress < 0.85 ? 0.4 : 0,
                                transition: 'opacity 0.5s',
                            }}
                        />
                    ))}
                </div>

                <div className="container px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 lg:gap-20">
                        {letters.map((item, index) => {
                            const appearStart = 0.08 + index * 0.08;
                            const appearEnd = appearStart + 0.12;

                            let opacity = 0;
                            let yOffset = 80;
                            let scale = 0.5;
                            let blur = 10;

                            if (scrollProgress >= appearStart) {
                                const localProgress = Math.min(1, (scrollProgress - appearStart) / (appearEnd - appearStart));
                                // Easing: cubic ease-out
                                const eased = 1 - Math.pow(1 - localProgress, 3);
                                opacity = eased;
                                yOffset = 80 * (1 - eased);
                                scale = 0.5 + 0.5 * eased;
                                blur = 10 * (1 - eased);
                            }

                            // Fade out at the end
                            if (scrollProgress > 0.75) {
                                const fadeOut = Math.max(0, 1 - (scrollProgress - 0.75) * 4);
                                opacity *= fadeOut;
                                scale += (1 - fadeOut) * 0.3;
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
                                    <span className="text-8xl md:text-[10rem] lg:text-[12rem] font-display font-black bg-gradient-to-br from-neon-cyan via-white to-neon-purple text-transparent bg-clip-text leading-none drop-shadow-[0_0_60px_rgba(0,255,170,0.3)]">
                                        {item.letter}
                                    </span>
                                    <span className="text-lg md:text-2xl lg:text-3xl font-bold mt-2 md:mt-4 tracking-[0.3em] text-background/70 uppercase">
                                        {item.word}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tagline */}
                    <div
                        className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 text-center w-full px-4"
                        style={{
                            opacity: scrollProgress > 0.55 && scrollProgress < 0.85 ? Math.min(1, (scrollProgress - 0.55) * 5) : 0,
                            transform: `translate(-50%, ${scrollProgress > 0.55 ? 0 : 30}px)`,
                            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
                        }}
                    >
                        <p className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-white">
                            No es un curso. Es un <span className="bg-gradient-to-r from-neon-cyan to-neon-purple text-transparent bg-clip-text">ecosistema</span>.
                        </p>
                        <p className="text-base md:text-lg text-white/40 mt-3 font-medium">
                            Scrolleá para descubrir
                        </p>
                    </div>
                </div>

            </div>
        </section>
    );
}
