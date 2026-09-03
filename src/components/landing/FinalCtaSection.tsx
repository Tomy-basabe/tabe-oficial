import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

export function FinalCtaSection() {
    const { theme } = useTheme();
    const logo = theme === "dark" ? "/logos/tabe-logo-dark.png" : "/logos/tabe-logo-light.png";

    return (
        <section className="py-20 md:py-28 bg-secondary/40">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                    <img src={logo} alt="TABE" className="w-20 h-20 mx-auto hover:scale-110 hover:-rotate-6 transition-all duration-300" />

                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight">
                        Tu próximo <span className="text-[#ff9415]">aprobado</span> empieza acá
                    </h2>

                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                        Unite a la comunidad de estudiantes que ya transformaron su forma de estudiar con TABE.
                    </p>

                    <Link to="/registro"
                        className="group inline-flex items-center gap-3 px-10 py-5 bg-foreground text-background rounded-xl font-extrabold text-xl border-2 border-foreground shadow-[5px_5px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415]">
                        Empezar Gratis
                        <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
