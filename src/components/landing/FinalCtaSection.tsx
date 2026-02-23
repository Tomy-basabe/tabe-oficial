import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";

export function FinalCtaSection() {
    return (
        <section className="py-32 relative overflow-hidden bg-background flex justify-center">
            {/* Glow Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neon-cyan/5 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-neon-cyan/20 rounded-full blur-[150px] mix-blend-screen -z-10" />

            <div className="container px-4 relative z-10 text-center max-w-4xl">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-neon-cyan to-neon-purple rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-neon-cyan/30">
                    <GraduationCap className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-black mb-8 leading-tight">
                    Tu rendimiento universitario no depende de la suerte, depende del <span className="gradient-text">método.</span>
                </h2>

                <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                    Únete a los estudiantes que ya dejaron de sobrevivir las materias filtro y empezaron a dominarlas.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/auth"
                        className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-3 hover:shadow-[0_0_40px_rgba(0,255,170,0.5)] transition-all hover:scale-105"
                    >
                        Acceder a TABE ahora
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                    <p className="mt-4 sm:mt-0 sm:ml-4 text-sm font-medium text-muted-foreground sm:max-w-[150px] text-left">
                        Empieza a preparar tu próximo examen
                    </p>
                </div>
            </div>
        </section>
    );
}
