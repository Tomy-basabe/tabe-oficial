import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  intro: string;
  meta: string[];
  sections: LegalSection[];
  contactLabel: string;
  contactEmail: string;
  related: { to: string; label: string };
  children: ReactNode;
}

/** Layout compartido de documentos legales (Términos / Privacidad): lectura limpia estilo Notion/Apple. */
export function LegalLayout({
  title,
  intro,
  meta,
  sections,
  contactLabel,
  contactEmail,
  related,
  children,
}: LegalLayoutProps) {
  const [active, setActive] = useState(sections[0]?.id);
  const [copied, setCopied] = useState(false);

  // Resalta en el índice la sección visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const goTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(contactEmail);
    setCopied(true);
    toast.success("Correo copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <LandingNavbar />

      <header className="pt-32 pb-10 md:pt-40 md:pb-14 border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">{title}</h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">{intro}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {meta.map((m, i) => (
              <span key={m} className="flex items-center gap-3">
                {i > 0 && <span className="w-1 h-1 rounded-full bg-border" />}
                {m}
              </span>
            ))}
            <span className="w-1 h-1 rounded-full bg-border" />
            <Link to={related.to} className="text-primary hover:underline underline-offset-4">
              {related.label}
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 max-w-5xl py-10 md:py-14 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-10 lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <nav aria-label="Índice del documento" className="space-y-0.5 border-l border-border/60">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(s.id)}
                    className={cn(
                      "block w-full text-left -ml-px pl-4 py-1.5 text-[13px] border-l transition-colors cursor-pointer",
                      active === s.id
                        ? "border-foreground text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>

              <div className="space-y-2 text-xs">
                <div className="font-medium text-foreground">{contactLabel}</div>
                <div className="flex items-center gap-2">
                  <a href={`mailto:${contactEmail}`} className="text-muted-foreground hover:text-foreground truncate transition-colors">
                    {contactEmail}
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    title="Copiar correo"
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
