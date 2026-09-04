import { Mail, MessageSquare, MapPin, Send, ChevronRight, CheckCircle2 } from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Contact() {
    return (
        <div className="min-h-screen bg-background">
            <LandingNavbar />

            <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden bg-secondary/40">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block px-4 py-2 rounded-lg bg-[#ff9415]/10 border-2 border-[#ff9415]/20 text-sm font-extrabold text-[#ff9415] mb-5">
                            📬 Contacto
                        </span>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight mb-6">
                            Hablemos. <span className="text-[#ff9415]">Estamos acá</span> para ayudarte.
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                            ¿Tenés dudas, consultas, sugerencias o querés sumar tu carrera? Respondemos a la brevedad.
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-20 md:py-28">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto">
                        <div>
                            <span className="inline-block px-4 py-2 rounded-lg bg-[#1475e5]/10 border-2 border-[#1475e5]/20 text-sm font-extrabold text-[#1475e5] mb-5">
                                Canales oficiales
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black mb-4">
                                Escribinos por <span className="text-[#1475e5]">donde prefieras</span>
                            </h2>
                            <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
                                Contactate con nuestro equipo de soporte técnico y administración a través de nuestros canales oficiales. Respondemos en menos de 24hs hábiles.
                            </p>

                            <div className="space-y-4">
                                {[
                                    { icon: Mail, title: "Email", value: "soporte.tabe@gmail.com", href: "mailto:soporte.tabe@gmail.com", color: "#1475e5", desc: "Respuesta en < 24hs" },
                                    { icon: MessageSquare, title: "WhatsApp", value: "+54 9 261 773-7367", href: "https://wa.me/5492617737367", color: "#48bd22", desc: "Chat directo", external: true },
                                    { icon: MapPin, title: "Ubicación", value: "Mendoza, Argentina", href: null, color: "#ff9415", desc: "Equipo remoto" },
                                ].map((item, i) => (
                                    <a key={i} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} className={`group flex items-center gap-4 p-4 bg-card rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-1 hover:border-${item.color.replace('#', '')} hover:shadow-[6px_6px_0_0_${item.color.replace('#', '')}]`}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3" style={{ borderColor: item.color, backgroundColor: item.color + "15" }}>
                                            <item.icon className="w-6 h-6" style={{ color: item.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-extrabold text-base truncate">{item.title}</h3>
                                            <p className="text-sm font-bold truncate" style={{ color: item.color }}>{item.value}</p>
                                        </div>
                                        <div className="text-xs text-muted-foreground font-bold whitespace-nowrap">{item.desc}</div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" style={{ color: item.color }} />
                                    </a>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t-2 border-border">
                                <h3 className="font-extrabold mb-4">Redes sociales</h3>
                                <div className="flex gap-3">
                                    <a href="https://www.instagram.com/tabe_oficial/" target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-card border-2 border-border hover:border-[#ff9415] hover:bg-[#ff9415]/10 transition-all">
                                        <MessageSquare className="w-5 h-5 text-[#ff9415]" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-xl p-6 md:p-8 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))]">
                            <h2 className="text-2xl md:text-3xl font-black mb-6">Envíanos un mensaje</h2>
                            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.location.href = "mailto:soporte.tabe@gmail.com?subject=" + encodeURIComponent("Contacto desde web") + "&body=" + encodeURIComponent("Nombre: " + (e.target.elements.nombre?.value || "") + "\nEmail: " + (e.target.elements.email?.value || "") + "\n\nMensaje:\n" + (e.target.elements.mensaje?.value || "")); }}>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Nombre</label>
                                    <input name="nombre" type="text" className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1475e5]/50 focus:border-[#1475e5] transition-all" placeholder="Tu nombre" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Email</label>
                                    <input name="email" type="email" className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1475e5]/50 focus:border-[#1475e5] transition-all" placeholder="tu@email.com" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Mensaje</label>
                                    <textarea name="mensaje" className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1475e5]/50 focus:border-[#1475e5] transition-all min-h-[120px] resize-none" placeholder="¿En qué te podemos ayudar?" required></textarea>
                                </div>
                                <button className="w-full py-4 rounded-xl bg-foreground text-background font-extrabold border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415] transition-all flex items-center justify-center gap-2">
                                    Enviar mensaje <Send className="w-5 h-5" />
                                </button>
                                <p className="text-xs text-muted-foreground text-center">Se abrirá tu cliente de email con el mensaje pre-cargado.</p>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 md:py-28 bg-secondary/40">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center p-8 md:p-16 rounded-[2.5rem] bg-card border-2 border-border/50 relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ff9415]/20 rounded-full blur-[120px] group-hover:bg-[#ff9415]/30 transition-colors duration-700" />
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#48bd22]/20 rounded-full blur-[120px] group-hover:bg-[#48bd22]/30 transition-colors duration-700" />

                        <div className="relative z-10">
                            <span className="inline-block px-4 py-2 rounded-lg bg-[#48bd22]/10 border-2 border-[#48bd22]/20 text-sm font-extrabold text-[#48bd22] mb-5">
                                Preguntas frecuentes
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                                ¿Dudas <span className="text-[#48bd22] italic">rápidas?</span>
                            </h2>
                            <p className="text-muted-foreground mb-10 text-lg leading-relaxed max-w-xl mx-auto">
                                Revisá nuestro FAQ o escribimos directamente. Nos encanta escuchar a la comunidad.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href="/#faq"
                                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-foreground text-background rounded-xl font-extrabold text-lg border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415]">
                                    Ver FAQ
                                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </a>
                                <a href="mailto:soporte.tabe@gmail.com"
                                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-card text-foreground rounded-xl font-extrabold text-lg border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--border))] active:translate-y-0.5 active:shadow-none">
                                    <Mail className="w-5 h-5 text-[#1475e5]" />
                                    Escribirnos
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <LandingFooter />
        </div>
    );
}