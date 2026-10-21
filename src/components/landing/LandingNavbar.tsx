import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Menu, X, ArrowUpRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useSmoothScroll } from "./SmoothScrollProvider";

export function LandingNavbar() {
    const { toggleTheme, resolvedTheme } = useTheme();
    const { scrollTo } = useSmoothScroll();
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", h, { passive: true });
        return () => window.removeEventListener("scroll", h);
    }, []);

    const logo = "/logo.png";

    const links = [
        { to: "/#showcase", label: "Módulos", scroll: true },
        { to: "/#superpoderes", label: "Superpoderes", scroll: true },
        { to: "/carreras", label: "Carreras" },
        { to: "/#metodologia", label: "Metodología", scroll: true },
        { to: "/#faq", label: "FAQ", scroll: true },
        { to: "/acerca-de", label: "Acerca de" },
        { to: "/contacto", label: "Contacto" },
    ];

    const handleScroll = (e: React.MouseEvent, href: string) => {
        if (window.location.pathname !== "/") return;
        e.preventDefault();
        const id = href.replace("/#", "");
        scrollTo(`#${id}`, -80);
        setOpen(false);
    };

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
            scrolled 
                ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 py-3 shadow-xs" 
                : "bg-transparent py-5"
        }`}>
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group" title="TABE - Tu Asistente de Bolsillo Estudiantil">
                    <img src={logo} alt="TABE" className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-105" />
                    <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">TABE</span>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1 bg-zinc-100/70 dark:bg-zinc-900/70 p-1 rounded-full border border-zinc-200/60 dark:border-zinc-800/60 backdrop-blur-md">
                    {links.map(l => (
                        l.scroll ? (
                            <a 
                                key={l.label} 
                                href={l.to} 
                                onClick={e => handleScroll(e, l.to)}
                                className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200"
                            >
                                {l.label}
                            </a>
                        ) : (
                            <Link 
                                key={l.label} 
                                to={l.to}
                                className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition-all duration-200"
                            >
                                {l.label}
                            </Link>
                        )
                    ))}
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-2.5">
                    <button 
                        onClick={toggleTheme}
                        aria-label="Cambiar tema"
                        className="p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <Link 
                        to="/registro"
                        className="group flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl font-medium text-xs transition-all shadow-xs cursor-pointer"
                    >
                        Entrar a la App
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </Link>
                </div>

                {/* Mobile Hamburger */}
                <button 
                    className="md:hidden p-2 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" 
                    onClick={() => setOpen(!open)}
                >
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 py-4 px-4 space-y-1.5 shadow-lg">
                    {links.map(l => (
                        l.scroll ? (
                            <a 
                                key={l.label} 
                                href={l.to} 
                                onClick={e => handleScroll(e, l.to)}
                                className="block px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
                            >
                                {l.label}
                            </a>
                        ) : (
                            <Link 
                                key={l.label} 
                                to={l.to} 
                                onClick={() => setOpen(false)}
                                className="block px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors"
                            >
                                {l.label}
                            </Link>
                        )
                    ))}
                    <div className="pt-3 flex items-center gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
                        <button 
                            onClick={toggleTheme} 
                            aria-label="Cambiar tema" 
                            className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        >
                            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <Link 
                            to="/registro" 
                            onClick={() => setOpen(false)}
                            className="flex-1 text-center py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl font-medium text-xs shadow-xs"
                        >
                            Entrar a la App
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
