import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function LandingNavbar() {
    const { theme, toggleTheme } = useTheme();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("");

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Track which section is currently in view
    useEffect(() => {
        const sectionIds = ["problema", "metodologia", "planes", "faq"];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
        );

        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        const targetId = href.replace("#", "");
        const el = document.getElementById(targetId);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setMobileMenuOpen(false);
    }, []);

    const navLinks = [
        { label: "El Problema", href: "#problema" },
        { label: "Metodología", href: "#metodologia" },
        { label: "Planes", href: "#planes" },
        { label: "FAQ", href: "#faq" },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${isScrolled
                ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5 py-3"
                : "bg-transparent py-5"
                }`}
        >
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-display font-bold text-2xl tracking-tight">TABE</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={(e) => scrollToSection(e, link.href)}
                            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300
                                ${activeSection === link.href.replace("#", "")
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {link.label}
                            {/* Active indicator */}
                            <span
                                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all duration-300
                                    ${activeSection === link.href.replace("#", "") ? "w-6 opacity-100" : "w-0 opacity-0"}`}
                            />
                        </a>
                    ))}
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-secondary transition-all duration-300 hover:scale-110 active:scale-95"
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <Link
                        to="/auth"
                        className="px-5 py-2.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-neon-cyan/25 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        Acceder a TABE
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <div className="relative w-6 h-6">
                        <X className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${mobileMenuOpen ? "opacity-100 rotate-0" : "opacity-0 rotate-90"}`} />
                        <Menu className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${mobileMenuOpen ? "opacity-0 -rotate-90" : "opacity-100 rotate-0"}`} />
                    </div>
                </button>
            </div>

            {/* Mobile Menu */}
            <div
                className={`md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-xl transition-all duration-400 overflow-hidden ${mobileMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                <div className="py-4 px-4 flex flex-col gap-1">
                    {navLinks.map((link, i) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={(e) => scrollToSection(e, link.href)}
                            className={`font-medium px-4 py-3 hover:bg-secondary rounded-xl transition-all duration-300 ${activeSection === link.href.replace("#", "") ? "bg-secondary/50 text-foreground" : "text-muted-foreground"}`}
                            style={{ transitionDelay: mobileMenuOpen ? `${i * 50}ms` : "0ms" }}
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="h-px bg-border my-3" />
                    <div className="flex items-center justify-between px-4 py-2">
                        <span className="font-medium">Tema</span>
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl bg-secondary hover:scale-110 active:scale-95 transition-all duration-300"
                        >
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                    <Link
                        to="/auth"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center px-5 py-3.5 mt-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-semibold active:scale-95 transition-transform"
                    >
                        Acceder a TABE
                    </Link>
                </div>
            </div>
        </nav>
    );
}
