import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Clock, Award } from "lucide-react";
import { Link } from "react-router-dom";

export function FinalCtaSection() {
    return (
        <section id="showcase" className="py-20 md:py-28 relative overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 text-white dark:from-[#1a1a1a] dark:to-[#111111] border-2 border-zinc-700/80 dark:border-zinc-700 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
                    
                    {/* Subtle ambient light */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-6 max-w-2xl mx-auto">

                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                            Comenzá hoy tu próximo cuatrimestre con ventaja
                        </h2>

                        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
                            Unite gratis a TABE y experimentá el salto en productividad, claridad y calma mental al estudiar.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <Link
                                to="/registro"
                                style={{ backgroundColor: "#ffffff", color: "#09090b" }}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl !bg-white !text-zinc-950 hover:!bg-zinc-100 font-bold text-sm transition-all shadow-lg hover:shadow-xl cursor-pointer"
                            >
                                Registrarme gratis
                                <ArrowRight className="w-4 h-4 !text-zinc-950" />
                            </Link>

                            <Link
                                to="/carreras"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 bg-white/5 hover:bg-white/10 text-zinc-200 font-medium text-sm transition-all cursor-pointer"
                            >
                                Ver planes de estudio
                            </Link>
                        </div>

                        <div className="pt-6 grid grid-cols-3 gap-4 border-t border-zinc-700/80 text-center">
                            <div>
                                <div className="text-xl sm:text-2xl font-bold text-white">+350</div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">Estudiantes</div>
                            </div>
                            <div>
                                <div className="text-xl sm:text-2xl font-bold text-white">100%</div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">Gratuito</div>
                            </div>
                            <div>
                                <div className="text-xl sm:text-2xl font-bold text-white">4.9 / 5</div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">Valoración</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
