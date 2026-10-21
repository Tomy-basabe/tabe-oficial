import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  MessageSquare,
  MapPin,
  Send,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { toast } from "sonner";

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: "Correo Electrónico",
    value: "soporte.tabe@gmail.com",
    href: "mailto:soporte.tabe@gmail.com",
    caption: "Respuesta en < 24hs hábiles",
    external: false,
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Oficial",
    value: "+54 9 261 773-7367",
    href: "https://wa.me/5492617737367",
    caption: "Atención directa de soporte",
    external: true,
  },
  {
    icon: MapPin,
    title: "Sede de Desarrollo",
    value: "Mendoza, Argentina",
    href: null,
    caption: "Comunidad académica de Latam",
    external: false,
  },
];

export default function Contact() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("Consulta general");
  const [mensaje, setMensaje] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email || !mensaje) {
      toast.error("Por favor completá todos los campos requeridos.");
      return;
    }

    const subject = `[Contacto TABE] ${motivo} - ${nombre}`;
    const body = `Nombre: ${nombre}\nEmail: ${email}\nMotivo: ${motivo}\n\nMensaje:\n${mensaje}`;
    const mailtoUrl = `mailto:soporte.tabe@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setSubmitted(true);
    toast.success("Abriendo tu cliente de correo...");
    window.location.href = mailtoUrl;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-foreground">
      <LandingNavbar />

      <main className="flex-1">
        {/* Header Hero */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden border-b border-border/50">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-primary/8 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-4xl text-center space-y-4">

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Hablemos. Estamos para ayudarte.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
              ¿Tenés dudas, consultas, sugerencias o querés que sumemos la malla de tu carrera? Escribinos y nuestro equipo te responderá a la brevedad.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 md:py-24 border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-14 items-start">
              {/* Canales y Métodos */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                    Vías de atención rápida
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 font-normal">
                    Podes escribirnos por correo o WhatsApp. Ambos canales son atendidos directamente por el equipo de TABE.
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  {CONTACT_CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    const isLink = Boolean(ch.href);
                    const Content = (
                      <div className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/80 shadow-sm hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">
                              {ch.title}
                            </div>
                            <div className="text-sm font-semibold text-foreground mt-0.5">
                              {ch.value}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {ch.caption}
                            </div>
                          </div>
                        </div>
                        {isLink && (
                          <div className="text-muted-foreground group-hover:text-primary transition-colors p-1">
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );

                    return isLink ? (
                      <a
                        key={ch.title}
                        href={ch.href!}
                        target={ch.external ? "_blank" : undefined}
                        rel={ch.external ? "noopener noreferrer" : undefined}
                        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
                      >
                        {Content}
                      </a>
                    ) : (
                      <div key={ch.title}>{Content}</div>
                    );
                  })}
                </div>

                {/* Compromiso de Respuesta */}
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border/60 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-semibold block mb-0.5">
                      Garantía de respuesta
                    </strong>
                    Revisamos cada mensaje recibido. Las sugerencias de nuevas universidades o planes de estudio se procesan y catalogan periódicamente.
                  </div>
                </div>
              </div>

              {/* Formulario de Mensaje */}
              <div className="lg:col-span-7">
                <div className="bg-card/95 backdrop-blur-xl border border-border/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                  <div className="space-y-1 mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Envianos tu mensaje
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Completá el formulario para pre-cargar tu consulta directamente hacia nuestro buzón de soporte.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          required
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Tu nombre o apodo"
                          className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Correo electrónico
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nombre@universidad.edu.ar"
                          className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Motivo de contacto
                      </label>
                      <select
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer"
                      >
                        <option value="Consulta general">Consulta general</option>
                        <option value="Sumar mi carrera o plan de estudio">Sumar mi carrera o plan de estudio</option>
                        <option value="Soporte técnico o error en la app">Soporte técnico o error en la app</option>
                        <option value="Sugerencia de nueva función">Sugerencia de nueva función</option>
                        <option value="Privacidad o datos">Privacidad o datos personales</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Mensaje
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder="Contanos en detalle qué necesitás o qué carrera te gustaría que incorporemos..."
                        className="w-full p-3.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/60 resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Enviar mensaje</span>
                      <Send className="w-4 h-4" />
                    </button>

                    <p className="text-[11px] text-muted-foreground text-center pt-1 font-normal">
                      Se preparará el correo con los datos ingresados para que lo envíes con un solo clic.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de FAQ Rápido */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl text-center">
            <div className="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-xl ring-1 ring-black/[0.04] dark:ring-white/[0.06] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 text-primary flex items-center justify-center mx-auto">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                ¿Tenés una duda rápida?
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Consultá nuestras preguntas frecuentes con respuestas inmediatas sobre sincronización, carreras y uso sin conexión.
              </p>
              <div className="pt-2">
                <Link
                  to="/#faq"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors"
                >
                  <span>Revisar Preguntas Frecuentes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
