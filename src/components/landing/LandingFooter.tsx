import { Link } from "react-router-dom";
import { Instagram, Heart } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function LandingFooter() {
    const { resolvedTheme } = useTheme();
    const logo = "/logo.png";

    return (
        <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#111111]/50 backdrop-blur-md">
            <div className="container mx-auto px-4 md:px-6 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
                    <div className="col-span-2 md:col-span-1 space-y-3">
                        <Link to="/" className="flex items-center gap-2.5" title="TABE">
                            <img src={logo} alt="TABE" className="w-8 h-8 object-contain" />
                            <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">TABE</span>
                        </Link>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                            Tu asistente de bolsillo estudiantil: la plataforma todo-en-uno concebida para estudiantes universitarios.
                        </p>
                        <a 
                            href="https://www.instagram.com/tabe_oficial/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium"
                        >
                            <Instagram className="w-3.5 h-3.5" /> @tabe_oficial
                        </a>
                    </div>

                    <div className="space-y-2.5">
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Plataforma</h4>
                        <div className="flex flex-col space-y-1.5">
                            <Link to="/carreras" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Carreras</Link>
                            <Link to="/guia-de-estudio" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Guías de Estudio</Link>
                            <Link to="/registro" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Registrarse</Link>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Comunidad</h4>
                        <div className="flex flex-col space-y-1.5">
                            <Link to="/acerca-de" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Acerca de</Link>
                            <Link to="/contacto" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Contacto</Link>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Legal</h4>
                        <div className="flex flex-col space-y-1.5">
                            <Link to="/privacidad" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacidad</Link>
                            <Link to="/terminos" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Términos y Condiciones</Link>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                    <p>© {new Date().getFullYear()} TABE. Todos los derechos reservados.</p>
                    <p className="flex items-center gap-1">
                        Hecho por un estudiante para estudiantes <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                    </p>
                </div>
            </div>
        </footer>
    );
}
