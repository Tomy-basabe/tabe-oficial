import { Zap, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function FinalCtaSection() {
    return (
        <section className="relative py-28 md:py-32 overflow-hidden bg-[#ff9415] border-y-4 sm:border-y-8 border-black select-none">
            {/* Background elements */}
            <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute -top-10 -left-10 w-36 h-36 md:w-44 md:h-44 bg-[#00E5FF] border-4 sm:border-8 border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000]"
            />
            <motion.div 
                animate={{ rotate: -360, y: [0, -15, 0] }} 
                transition={{ rotate: { repeat: Infinity, duration: 15, ease: "linear" }, y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                className="absolute bottom-10 -right-5 w-28 h-28 md:w-36 md:h-36 bg-[#FFD700] rounded-full border-4 sm:border-8 border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] flex items-center justify-center"
            >
                <Star className="w-10 h-10 md:w-14 md:h-14 text-black fill-black" />
            </motion.div>

            <motion.div 
                animate={{ x: [0, 15, 0], y: [0, -8, 0] }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-14 sm:top-20 right-8 sm:right-20 hidden md:block"
            >
                <div className="bg-white px-4 py-2 border-3 sm:border-4 border-black shadow-[4px_4px_0_0_#000] font-black text-black rotate-12 text-sm sm:text-base">
                    ¡+350 estudiantes!
                </div>
            </motion.div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center space-y-8 md:space-y-10 bg-white p-8 sm:p-12 md:p-16 border-4 sm:border-8 border-black shadow-[10px_10px_0_0_#000] sm:shadow-[16px_16px_0_0_#000]">
                    
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="mx-auto w-24 h-24 sm:w-28 sm:h-28 bg-white border-3 sm:border-4 border-black rounded-2xl p-2 shadow-[6px_6px_0_0_#00E5FF] sm:shadow-[8px_8px_0_0_#00E5FF] -mt-20 sm:-mt-24 mb-4 relative flex items-center justify-center"
                    >
                        <img src="/logo.png" alt="TABE" className="w-full h-full object-contain drop-shadow-md" />
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                            className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 bg-[#FFD700] rounded-full p-1.5 sm:p-2 border-2 sm:border-3 border-black"
                        >
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                        </motion.div>
                    </motion.div>

                    <motion.h2 
                        initial={{ y: 40, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-black leading-[1.08] uppercase tracking-tighter"
                    >
                        Tu próximo{" "}
                        <span className="bg-[#00E5FF] px-2 sm:px-3 text-black border-3 sm:border-4 border-black inline-block -rotate-2 shadow-[4px_4px_0_0_#000]">
                            aprobado
                        </span>
                        <br />
                        empieza acá
                    </motion.h2>

                    <motion.p 
                        initial={{ y: 30, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.25 }}
                        className="text-base sm:text-xl md:text-2xl font-bold text-black max-w-2xl mx-auto"
                    >
                        Dejá de procrastinar. Unite a los estudiantes que ya dominaron la universidad con TABE.
                    </motion.p>

                    <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", delay: 0.35 }}
                        className="pt-2"
                    >
                        <Link to="/registro"
                            className="group relative inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-6 bg-[#00E5FF] text-black font-black text-lg sm:text-2xl uppercase tracking-widest border-3 sm:border-4 border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] transition-all hover:bg-white hover:translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#000] sm:hover:shadow-[12px_12px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-none overflow-hidden cursor-pointer"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                EMPEZAR AHORA <Zap className="w-6 h-6 sm:w-8 sm:h-8 fill-[#FFD700]" />
                            </span>
                            <div className="absolute inset-0 bg-[#FFD700] -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
