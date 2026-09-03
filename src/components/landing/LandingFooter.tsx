import { Link } from "react-router-dom";
import { Instagram, Heart } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function LandingFooter() {
    const { theme } = useTheme();
    const logo = theme === "dark" ? "/logos/tabe-logo-dark.png" : "/logos/tabe-logo-light.png";

    return (
        <footer className="border-t-2 border-border bg-card/50">
            <div className="container mx-auto px-4 md:px-6 py-12">
                <div className="grid md:grid-cols-4 gap-10">
                    <div className="md:col-span-1 space-y-4">
                        <Link to="/" className="flex items-center gap-2.5">
                            <img src={logo} alt="TABE" className="w-9 h-9 object-contain" />
                            <span className="font-black text-xl tracking-tight">TABE</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">La plataforma todo-en-uno para estudiantes universitarios.</p>
                        <a href="https://www.instagram.com/tabe_oficial/" target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#ff9415] transition-colors font-bold">
                            <Instagram className="w-4 h-4" /> @tabe_oficial
                        </a>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-extrabold text-xs uppercase tracking-widest text-muted-foreground">Producto</h4>
                        <div className="flex flex-col gap-2">
                            <Link to="/carreras" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Carreras</Link>
                            <Link to="/guia-de-estudio" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Guías de Estudio</Link>
                            <Link to="/registro" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Registrarse</Link>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-extrabold text-xs uppercase tracking-widest text-muted-foreground">Empresa</h4>
                        <div className="flex flex-col gap-2">
                            <Link to="/acerca-de" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Acerca de</Link>
                            <Link to="/contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Contacto</Link>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-extrabold text-xs uppercase tracking-widest text-muted-foreground">Legal</h4>
                        <div className="flex flex-col gap-2">
                            <Link to="/privacidad" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Privacidad</Link>
                            <Link to="/terminos" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold">Términos</Link>
                        </div>
                    </div>
                </div>
                <div className="mt-10 pt-6 border-t-2 border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 font-bold">
                        Hecho con <Heart className="w-3 h-3 text-[#ff9415] fill-[#ff9415]" /> por estudiantes, para estudiantes
                    </p>
                    <p className="text-xs text-muted-foreground font-bold">© {new Date().getFullYear()} TABE. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
