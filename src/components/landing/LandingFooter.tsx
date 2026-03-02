import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-background py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-display font-bold text-xl tracking-tight">TABE</span>
                    </div>

                    <div className="flex flex-wrap gap-4 sm:gap-6 text-sm font-medium text-muted-foreground">
                        <Link to="/acerca-de" className="hover:text-foreground transition-colors">
                            Acerca de
                        </Link>
                        <Link to="/contacto" className="hover:text-foreground transition-colors">
                            Contacto
                        </Link>
                        <Link to="/privacidad" className="hover:text-foreground transition-colors">
                            Privacidad
                        </Link>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        © {currentYear} TABE. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
