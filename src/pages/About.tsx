import { Users, Target, Shield, Heart, BookOpen, Brain, ChevronRight } from "lucide-react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function About() {
    return (
        <div className="min-h-screen bg-background">
            <LandingNavbar />

            <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden bg-secondary/40">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block px-4 py-2 rounded-lg bg-[#1475e5]/10 border-2 border-[#1475e5]/20 text-sm font-extrabold text-[#1475e5] mb-5">
                            🏛️ Sobre TABE
                        </span>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight mb-6">
                            Tu Asistente de Bolsillo <span className="text-[#ff9415]">Estudiantil</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                            La plataforma integral creada por y para estudiantes universitarios latinoamericanos.
                        </p>
                    </div>
                </div>
            </section>

            <section id="quienes-somos" className="py-20 md:py-28">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
                        <div>
                            <span className="inline-block px-4 py-2 rounded-lg bg-[#ff9415]/10 border-2 border-[#ff9415]/20 text-sm font-extrabold text-[#ff9415] mb-5">
                                Quiénes somos
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black mb-4">
                                Nacimos en <span className="text-[#ff9415]">Mendoza</span>, crecimos en toda Latam
                            </h2>
                            <p className="text-muted-foreground leading-relaxed mb-6 text-lg">
                                TABE no es solo una aplicación; es el resultado de años de observación en el ecosistema universitario latinoamericano. Fundada por un grupo de estudiantes de ingeniería, la plataforma nació para resolver un problema crítico: la fragmentación de la información y la falta de metodologías de alto rendimiento accesibles para todos.
                            </p>
                            <p className="text-muted-foreground leading-relaxed mb-6">
                                Hoy, somos un equipo multidisciplinario que combina pedagogía, psicología cognitiva y desarrollo de software de vanguardia. Nuestra visión es transformar la educación superior, proporcionando a cada estudiante un asistente que no solo organiza, sino que enseña a aprender.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {["Hecho por estudiantes", "Validado en facultades", "Open Source spirit"].map(t => (
                                    <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border-2 border-border text-sm font-bold text-muted-foreground hover:border-[#1475e5] hover:text-[#1475e5] transition-colors">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <div className="aspect-square max-w-md mx-auto lg:max-w-none rounded-2xl bg-gradient-to-br from-[#1475e5]/10 to-[#48bd22]/10 border-2 border-[#1475e5]/20 flex items-center justify-center p-8">
                                <Brain className="w-32 h-32 text-[#1475e5]/50" />
                            </div>
                            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-xl bg-[#ff9415] flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,.15)]">
                                <Users className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-xl bg-[#48bd22] flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,.15)]">
                                <Target className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="enfoque" className="py-20 md:py-28 bg-secondary/40">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="inline-block px-4 py-2 rounded-lg bg-[#48bd22]/10 border-2 border-[#48bd22]/20 text-sm font-extrabold text-[#48bd22] mb-5">
                            🧠 Enfoque Científico
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black mb-4">
                            Metodologías <span className="text-[#48bd22]">probadas</span>, no magia
                        </h2>
                        <p className="text-lg text-muted-foreground">Implementamos algoritmos basados en evidencia cognitiva.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: Brain, title: "Neurociencia Aplicada", desc: "Algoritmos basados en la curva del olvido de Ebbinghaus para optimizar el repaso espaciado.", color: "#1475e5", num: "01" },
                            { icon: Target, title: "IA Socrática", desc: "Nuestra inteligencia artificial guía al estudiante hacia la respuesta, no se la da.", color: "#ff9415", num: "02" },
                            { icon: Shield, title: "Open Education", desc: "Acceso libre a planes de estudio y guías metodológicas de alta calidad.", color: "#48bd22", num: "03" },
                        ].map((s, i) => (
                            <div key={i} className="group relative bg-card rounded-xl p-6 border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))]">
                                <div className="absolute -top-3 -right-2 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-black"
                                    style={{ borderColor: s.color, backgroundColor: s.color + "18", color: s.color }}>
                                    {s.num}
                                </div>
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 border-2 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
                                    style={{ borderColor: s.color, backgroundColor: s.color + "15" }}>
                                    <s.icon className="w-7 h-7" style={{ color: s.color }} />
                                </div>
                                <h3 className="font-extrabold text-xl mb-2">{s.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="impacto" className="py-20 md:py-28">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="inline-block px-4 py-2 rounded-lg bg-[#ffd21c]/10 border-2 border-[#ffd21c]/20 text-sm font-extrabold text-[#ffd21c] mb-5">
                            📊 Impacto
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black mb-4">
                            Números que <span className="text-[#ffd21c]">hablan</span>
                        </h2>
                        <p className="text-lg text-muted-foreground">Comunidad real, resultados reales.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {[
                            { val: "+1.000", label: "Estudiantes", color: "#ff9415" },
                            { val: "15+", label: "Carreras", color: "#1475e5" },
                            { val: "24/7", label: "Soporte IA", color: "#48bd22" },
                            { val: "Gratis", label: "Acceso Público", color: "#ffd21c" },
                        ].map((stat, i) => (
                            <div key={i} className="group text-center p-6 bg-card rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))]">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center border-2 transition-transform duration-200 group-hover:scale-110"
                                    style={{ borderColor: stat.color, backgroundColor: stat.color + "15" }}>
                                    <div className="text-3xl font-black" style={{ color: stat.color }}>{stat.val}</div>
                                </div>
                                <div className="text-xs uppercase tracking-widest text-muted-foreground font-black">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="valores" className="py-20 md:py-28 bg-secondary/40">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="inline-block px-4 py-2 rounded-lg bg-[#e53935]/10 border-2 border-[#e53935]/20 text-sm font-extrabold text-[#e53935] mb-5">
                            ❤️ Valores
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black mb-4">
                            Lo que nos <span className="text-[#e53935]">define</span>
                        </h2>
                        <p className="text-lg text-muted-foreground">Principios innegociables en cada decisión.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {[
                            { icon: BookOpen, title: "Excelencia Académica", desc: "Elevamos el estándar a través de metodologías eficientes y contenido validado.", color: "#1475e5" },
                            { icon: Users, title: "Colaboración", desc: "El aprendizaje no es solitario. Fomentamos comunidad y espíritu de equipo.", color: "#ff9415" },
                            { icon: Shield, title: "Transparencia", desc: "Protegemos tu progreso y datos de manera segura y honesta.", color: "#48bd22" },
                        ].map((v, i) => (
                            <div key={i} className="group text-center p-8 bg-card rounded-xl border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-2 hover:shadow-[8px_8px_0_0_hsl(var(--border))]">
                                <div className="w-16 h-16 mx-auto mb-5 rounded-xl flex items-center justify-center border-2 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
                                    style={{ borderColor: v.color, backgroundColor: v.color + "15" }}>
                                    <v.icon className="w-8 h-8" style={{ color: v.color }} />
                                </div>
                                <h3 className="font-extrabold text-lg mb-3">{v.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 md:py-28">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="max-w-3xl mx-auto text-center p-8 md:p-16 rounded-[2.5rem] bg-secondary/20 border-2 border-border/50 relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#1475e5]/20 rounded-full blur-[120px] group-hover:bg-[#1475e5]/30 transition-colors duration-700" />
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#48bd22]/20 rounded-full blur-[120px] group-hover:bg-[#48bd22]/30 transition-colors duration-700" />

                        <div className="relative z-10">
                            <span className="inline-block px-4 py-2 rounded-lg bg-[#ff9415]/10 border-2 border-[#ff9415]/20 text-sm font-extrabold text-[#ff9415] mb-5">
                                Únete a la revolución
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                                ¿Listo para <span className="text-[#ff9415] italic">estudiar mejor</span>?
                            </h2>
                            <p className="text-muted-foreground mb-10 text-lg leading-relaxed max-w-xl mx-auto">
                                Miles de estudiantes ya usan TABE para organizarse, estudiar con método y aprobar. Vos podés ser el siguiente.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <a href="/registro"
                                    className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-foreground text-background rounded-xl font-extrabold text-lg border-2 border-foreground shadow-[4px_4px_0_0_#ff9415] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ff9415] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#ff9415]">
                                    Empezar Gratis
                                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </a>
                                <a href="/carreras"
                                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-card text-foreground rounded-xl font-extrabold text-lg border-2 border-border shadow-[4px_4px_0_0_hsl(var(--border))] transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_hsl(var(--border))] active:translate-y-0.5 active:shadow-none">
                                    <BookOpen className="w-5 h-5 text-[#1475e5]" />
                                    Ver Carreras
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