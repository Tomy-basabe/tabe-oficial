import { Zap, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function FinalCtaSection() {
    return (
        <section className="relative py-32 overflow-hidden bg-[#ff9415] border-y-8 border-black">
            {/* Background elements */}
            <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute -top-10 -left-10 w-40 h-40 bg-[#00E5FF] border-8 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
            />
            <motion.div 
                animate={{ rotate: -360, y: [0, -20, 0] }} 
                transition={{ rotate: { repeat: Infinity, duration: 15, ease: "linear" }, y: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
                className="absolute bottom-10 -right-5 w-32 h-32 bg-[#FFD700] rounded-full border-8 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex items-center justify-center"
            >
                <Star className="w-12 h-12 text-black fill-black" />
            </motion.div>

            <motion.div 
                animate={{ x: [0, 20, 0], y: [0, -10, 0] }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-20 right-20 hidden lg:block"
            >
                <div className="bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-bold text-black rotate-12">
                    ¡+350 estudiantes!
                </div>
            </motion.div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center space-y-10 bg-white p-10 md:p-16 border-8 border-black shadow-[16px_16px_0_0_rgba(0,0,0,1)]">
                    
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="mx-auto w-28 h-28 bg-white border-4 border-black rounded-2xl p-2 shadow-[8px_8px_0_0_#00E5FF] -mt-24 mb-4 relative flex items-center justify-center"
                    >
                        <img src="/logo.png" alt="TABE" className="w-full h-full object-contain drop-shadow-md" />
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                            className="absolute -top-4 -right-4 bg-[#FFD700] rounded-full p-2 border-2 border-black"
                        >
                            <Sparkles className="w-6 h-6 text-black" />
                        </motion.div>
                    </motion.div>

                    <motion.h2 
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-black text-black leading-[1.1] uppercase tracking-tighter"
                    >
                        Tu próximo <span className="bg-[#00E5FF] px-2 text-black border-4 border-black inline-block -rotate-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">aprobado</span><br/> empieza acá
                    </motion.h2>

                    <motion.p 
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="text-xl md:text-2xl font-bold text-black max-w-2xl mx-auto"
                    >
                        Dejá de procrastinar. Unite a los estudiantes que ya dominaron la universidad con TABE.
                    </motion.p>

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", delay: 0.4 }}
                    >
                        <Link to="/registro"
                            className="group relative inline-flex items-center gap-3 px-12 py-6 bg-[#00E5FF] text-black font-black text-2xl uppercase tracking-widest border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] transition-all hover:bg-white hover:translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[0_0_0_0_rgba(0,0,0,1)] overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                EMPEZAR AHORA <Zap className="w-8 h-8 fill-[#FFD700]" />
                            </span>
                            <div className="absolute inset-0 bg-[#FFD700] -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
