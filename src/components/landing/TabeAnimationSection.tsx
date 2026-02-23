import { useEffect, useState, useRef } from "react";

export function TabeAnimationSection() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Calculate how far we've scrolled through the element
            // 0 = just entered viewport, 1 = leaving viewport
            const totalScrollable = rect.height + windowHeight;
            const scrolled = windowHeight - rect.top;

            let progress = scrolled / totalScrollable;
            progress = Math.max(0, Math.min(1, progress));
            setScrollProgress(progress);
        };

        window.addEventListener("scroll", handleScroll);
        handleScroll(); // init
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
            className="relative min-h-[120vh] bg-foreground text-background overflow-hidden"
        >
            <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">

                {/* Abstract Background Effects */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 blur-[120px] mix-blend-screen"
                    style={{
                        transform: `translate(-50%, -50%) scale(${0.5 + scrollProgress * 1.5})`,
                        opacity: scrollProgress > 0.8 ? 0 : 1
                    }}
                />

                <div className="container px-4">
                    <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                        {letters.map((item, index) => {
                            // Calculate individual delays for each letter based on scroll
                            const appearStart = index * 0.1;
                            const appearEnd = appearStart + 0.15;

                            let opacity = 0;
                            let yOffset = 50;

                            if (scrollProgress >= appearStart) {
                                const localProgress = Math.min(1, (scrollProgress - appearStart) / (appearEnd - appearStart));
                                opacity = localProgress;
                                yOffset = 50 * (1 - localProgress);
                            }

                            // Fade out at the end
                            if (scrollProgress > 0.8) {
                                opacity = Math.max(0, 1 - (scrollProgress - 0.8) * 5);
                            }

                            return (
                                <div
                                    key={index}
                                    className="flex flex-col items-center"
                                    style={{
                                        opacity,
                                        transform: `translateY(${yOffset}px)`,
                                    }}
                                >
                                    <span className="text-7xl md:text-9xl font-display font-black bg-gradient-to-br from-neon-cyan to-neon-purple text-transparent bg-clip-text">
                                        {item.letter}
                                    </span>
                                    <span className="text-xl md:text-3xl font-bold mt-4 tracking-widest text-background/80 uppercase">
                                        {item.word}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div
                        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center"
                        style={{
                            opacity: scrollProgress > 0.7 && scrollProgress < 0.9 ? 1 : 0,
                            transform: `translate(-50%, ${scrollProgress > 0.7 ? 0 : 20}px)`,
                            transition: 'all 0.5s ease-out'
                        }}
                    >
                        <p className="text-2xl md:text-4xl font-display font-bold text-white">
                            No es un curso. Es un <span className="text-neon-cyan">ecosistema</span>.
                        </p>
                    </div>
                </div>

            </div>
        </section>
    );
}
