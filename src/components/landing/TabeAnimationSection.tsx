import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function TabeAnimationSection() {
    const [phase, setPhase] = useState(0);
    // phase 0: nothing, 1-4: letters appear, 5: tagline, 6: scroll hint

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 200),
            setTimeout(() => setPhase(2), 400),
            setTimeout(() => setPhase(3), 600),
            setTimeout(() => setPhase(4), 800),
            setTimeout(() => setPhase(5), 1400),
            setTimeout(() => setPhase(6), 2200),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    const letters = [
        { letter: "T", word: "Tomas", index: 1 },
        { letter: "A", word: "Aprendizaje", index: 2 },
        { letter: "B", word: "Basado en", index: 3 },
        { letter: "E", word: "Experiencia", index: 4 },
    ];

    return (
        <section className="relative h-screen bg-[#0a0a1a] flex items-center justify-center overflow-hidden">

            {/* Background glow */}
            <div
                className="absolute top-1/2 left-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full bg-gradient-to-br from-neon-cyan/15 to-neon-purple/15 blur-[120px] pointer-events-none transition-all duration-[2000ms]"
                style={{
                    transform: `translate(-50%, -50%) scale(${phase >= 4 ? 1.3 : 0.5})`,
                    opacity: phase >= 1 ? 0.6 : 0,
                }}
            />

            {/* Letters */}
            <div className="container px-4 relative z-10 flex flex-col items-center">
                <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-10 lg:gap-16">
                    {letters.map((item) => (
                        <div
                            key={item.index}
                            className="flex flex-col items-center transition-all duration-700 ease-out"
                            style={{
                                opacity: phase >= item.index ? 1 : 0,
                                transform: phase >= item.index ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.8)',
                            }}
                        >
                            <span className="text-7xl md:text-9xl lg:text-[10rem] font-display font-black bg-gradient-to-br from-neon-cyan via-white/90 to-neon-purple text-transparent bg-clip-text leading-none">
                                {item.letter}
                            </span>
                            <span className="text-sm md:text-lg lg:text-xl font-bold mt-1 md:mt-3 tracking-[0.25em] text-white/40 uppercase">
                                {item.word}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Tagline */}
                <div
                    className="mt-12 md:mt-16 text-center transition-all duration-700 ease-out"
                    style={{
                        opacity: phase >= 5 ? 1 : 0,
                        transform: phase >= 5 ? 'translateY(0)' : 'translateY(15px)',
                    }}
                >
                    <p className="text-xl md:text-3xl lg:text-4xl font-display font-bold text-white/90">
                        No es un curso. Es un{" "}
                        <span className="bg-gradient-to-r from-neon-cyan to-neon-purple text-transparent bg-clip-text">ecosistema</span>.
                    </p>
                </div>

                {/* Scroll hint */}
                <div
                    className="mt-10 transition-all duration-700 ease-out"
                    style={{
                        opacity: phase >= 6 ? 0.5 : 0,
                        transform: phase >= 6 ? 'translateY(0)' : 'translateY(10px)',
                    }}
                >
                    <a href="#hero" className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
                        <span className="text-xs uppercase tracking-widest">Descubrí más</span>
                        <ChevronDown className="w-5 h-5 animate-bounce" />
                    </a>
                </div>
            </div>
        </section>
    );
}
