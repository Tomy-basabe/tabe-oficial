import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function LandingNavbar() {
    const { theme, toggleTheme } = useTheme();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { label: "El Problema", href: "#problema" },
        { label: "Metodología", href: "#metodologia" },
        { label: "Planes", href: "#planes" },
        { label: "FAQ", href: "#faq" },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled
                ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm py-3"
                : "bg-transparent py-5"
                }`}
        >
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center group-hover:scale-105 transition-transform">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-display font-bold text-2xl tracking-tight">TABE</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <Link
                        to="/auth"
                        className="px-5 py-2.5 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-neon-cyan/25 transition-all hover:scale-105"
                    >
                        Acceder a TABE
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border shadow-lg py-4 px-4 flex flex-col gap-4 animate-fade-in">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="font-medium px-4 py-2 hover:bg-secondary rounded-lg"
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="h-px bg-border my-2" />
                    <div className="flex items-center justify-between px-4">
                        <span className="font-medium">Tema</span>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full bg-secondary"
                        >
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                    <Link
                        to="/auth"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center px-5 py-3 mt-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-semibold"
                    >
                        Acceder a TABE
                    </Link>
                </div>
            )}
        </nav>
    );
}
