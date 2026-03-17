import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Users, Target, Shield, Heart } from "lucide-react";

export default function About() {
    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Volver al inicio</span>
                    </Link>
                    <div className="font-display font-bold text-xl tracking-tight gradient-text">TABE</div>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                        Acerca de <span className="gradient-text">TABE</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Tu Asistente de Bolsillo Estudiantil: La plataforma integral creada por y para estudiantes.
                    </p>
                </div>

                <div className="space-y-16">
                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                                <Users className="w-6 h-6 text-neon-purple" />
                                ¿Quiénes somos?
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                TABE nació en las aulas de ingeniería de Mendoza, Argentina, como respuesta a la necesidad de centralizar las herramientas de estudio. Somos un equipo interdisciplinario de desarrolladores y estudiantes avanzados que creen que la tecnología debe ser el puente, no la barrera, para el éxito académico. Nuestro compromiso es con la educación pública y privada de calidad en toda Latinoamérica.
                            </p>
                        </div>
                        <div className="card-gamer p-8 rounded-2xl bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5 border border-border">
                            <h3 className="font-bold text-lg mb-2 text-neon-cyan whitespace-nowrap">Propuesta de Valor Única</h3>
                            <ul className="text-sm text-muted-foreground space-y-2">
                                <li>• IA entrenada para planes de estudio reales.</li>
                                <li>• Sincronización multi-dispositivo inmediata.</li>
                                <li>• Comunidad de apoyo estudiantil activa.</li>
                                <li>• Gratuidad en las funciones esenciales.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                                <Target className="w-6 h-6 text-neon-cyan" />
                                Nuestra Misión
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Nuestra misión en TABE es democratizar y optimizar la educación superior mediante el uso integrado de inteligencia artificial, herramientas de productividad probadas (como Pomodoro) y analíticas detalladas de rendimiento. Queremos que el estudiante deje de preocuparse por &quot;cómo organizar su tiempo&quot; y se enfoque puramente en aprender.
                            </p>
                        </div>
                        <div className="card-gamer p-8 rounded-2xl bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5 border border-border">
                            <h3 className="font-bold text-lg mb-2">Significado de TABE</h3>
                            <p className="text-sm text-muted-foreground">
                                <strong className="text-foreground">T</strong>u<br />
                                <strong className="text-foreground">A</strong>sistente de<br />
                                <strong className="text-foreground">B</strong>olsillo<br />
                                <strong className="text-foreground">E</strong>studiantil<br />
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-2 justify-center">
                            <Heart className="w-6 h-6 text-neon-gold" />
                            Nuestros Valores
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="card-gamer p-6 rounded-xl text-center">
                                <BookOpen className="w-8 h-8 text-neon-cyan mx-auto mb-4" />
                                <h3 className="font-bold mb-2">Excelencia Académica</h3>
                                <p className="text-sm text-muted-foreground">Creemos en elevar el estándar de los estudiantes a través de metodologías eficientes.</p>
                            </div>
                            <div className="card-gamer p-6 rounded-xl text-center">
                                <Users className="w-8 h-8 text-neon-purple mx-auto mb-4" />
                                <h3 className="font-bold mb-2">Colaboración</h3>
                                <p className="text-sm text-muted-foreground">El aprendizaje no debe ser un camino solitario. Fomentamos la colaboración y el espíritu de equipo estudiantil.</p>
                            </div>
                            <div className="card-gamer p-6 rounded-xl text-center">
                                <Shield className="w-8 h-8 text-neon-green mx-auto mb-4" />
                                <h3 className="font-bold mb-2">Transparencia</h3>
                                <p className="text-sm text-muted-foreground">Protegemos tu progreso y tus datos de manera transparente y segura.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
