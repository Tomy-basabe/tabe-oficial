import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Menu, X, ChevronRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function LandingNavbar() {
    const { theme, toggleTheme } = useTheme();
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", h, { passive: true });
        return () => window.removeEventListener("scroll", h);
    }, []);

    const logo = theme === "dark" ? "/logos/tabe-logo-dark.png" : "/logos/tabe-logo-light.png";

    const links = [
        { to: "/carreras", label: "Carreras" },
        { to: "/#metodologia", label: "Metodología", scroll: true },
        { to: "/#planes", label: "Planes", scroll: true },
        { to: "/#faq", label: "FAQ", scroll: true },
        { to: "/acerca-de", label: "Acerca de" },
        { to: "/contacto", label: "Contacto" },
    ];

    const handleScroll = (e: React.MouseEvent, href: string) => {
        if (window.location.pathname !== "/") return;
        e.preventDefault();
        const id = href.replace("/#", "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        setOpen(false);
    };

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-xl border-b-2 border-border py-2" : "bg-transparent py-5"}`}>
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group">
                    <img src={logo} alt="TABE" className="w-10 h-10 object-contain transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                    <span className="font-black text-2xl tracking-tight">TABE</span>
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map(l => (
                        l.scroll ? (
                            <a key={l.label} href={l.to} onClick={e => handleScroll(e, l.to)}
                                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-all duration-200">
                                {l.label}
                            </a>
                        ) : (
                            <Link key={l.label} to={l.to}
                                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-all duration-200">
                                {l.label}
                            </Link>
                        )
                    ))}
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-3">
                    <button onClick={toggleTheme}
                        className="p-2.5 rounded-lg border-2 border-border bg-card hover:bg-secondary transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <Link to="/registro"
                        className="group flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-lg font-extrabold text-sm border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--tab-orange))] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_hsl(var(--tab-orange))] active:translate-y-0.5 active:shadow-none">
                        Entrar a la App
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {/* Mobile */}
                <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
                    {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="md:hidden absolute top-full left-0 w-full bg-background border-b-2 border-border py-4 px-4 space-y-1">
                    {links.map(l => (
                        l.scroll ? (
                            <a key={l.label} href={l.to} onClick={e => handleScroll(e, l.to)}
                                className="block px-4 py-3 font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg">
                                {l.label}
                            </a>
                        ) : (
                            <Link key={l.label} to={l.to} onClick={() => setOpen(false)}
                                className="block px-4 py-3 font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg">
                                {l.label}
                            </Link>
                        )
                    ))}
                    <div className="pt-3 flex items-center gap-3">
                        <button onClick={toggleTheme} className="p-2.5 rounded-lg border-2 border-border">
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <Link to="/registro" onClick={() => setOpen(false)}
                            className="flex-1 text-center py-3 bg-foreground text-background rounded-lg font-extrabold border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--tab-orange))]">
                            Entrar a la App
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
