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
                        <div className="prose prose-invert lg:prose-xl">
                            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                                <Users className="w-6 h-6 text-neon-purple" />
                                ¿Quiénes somos?
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                TABE no es solo una aplicación; es el resultado de años de observación en el ecosistema universitario latinoamericano. Fundada por un grupo de estudiantes de ingeniería en Mendoza, Argentina, la plataforma nació para resolver un problema crítico: la fragmentación de la información y la falta de metodologías de alto rendimiento accesibles para todos.
                            </p>
                            <p className="text-muted-foreground leading-relaxed mt-4">
                                Hoy, somos un equipo multidisciplinario que combina pedagogía, psicología cognitiva y desarrollo de software de vanguardia. Nuestra visión es transformar la educación superior, proporcionando a cada estudiante un asistente que no solo organiza, sino que enseña a aprender.
                            </p>
                        </div>
                        <div className="card-gamer p-8 rounded-2xl bg-gradient-to-br from-neon-purple/5 to-neon-cyan/5 border border-border">
                            <h3 className="font-bold text-lg mb-2 text-neon-cyan whitespace-nowrap">Nuestro Enfoque Científico</h3>
                            <ul className="text-sm text-muted-foreground space-y-4">
                                <li className="flex gap-2">
                                    <Shield className="w-5 h-5 text-neon-cyan shrink-0" />
                                    <span><strong>Neurociencia Aplicada:</strong> Implementamos algoritmos basados en la curva del olvido de Ebbinghaus para optimizar el repaso.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Target className="w-5 h-5 text-neon-purple shrink-0" />
                                    <span><strong>IA Socrática:</strong> Nuestra inteligencia artificial está diseñada para guiar al estudiante hacia la respuesta, no para dársela.</span>
                                </li>
                                <li className="flex gap-2">
                                    <BookOpen className="w-5 h-5 text-neon-green shrink-0" />
                                    <span><strong>Open Education:</strong> Creemos en el acceso libre a los planes de estudio y guías metodológicas de alta calidad.</span>
                                </li>
                            </ul>
                        </div>
                    </section>

                    <section className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 card-gamer p-8 rounded-2xl bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5 border border-border">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <Target className="w-6 h-6 text-neon-gold" />
                                Nuestro Impacto
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-background/50 rounded-xl">
                                    <div className="text-3xl font-bold gradient-text">+1000</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Estudiantes</div>
                                </div>
                                <div className="text-center p-4 bg-background/50 rounded-xl">
                                    <div className="text-3xl font-bold gradient-text">12</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Carreras</div>
                                </div>
                                <div className="text-center p-4 bg-background/50 rounded-xl">
                                    <div className="text-3xl font-bold gradient-text">24/7</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Soporte IA</div>
                                </div>
                                <div className="text-center p-4 bg-background/50 rounded-xl">
                                    <div className="text-3xl font-bold gradient-text">Gratis</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Acceso Público</div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-neon-cyan" />
                                Compromiso de Calidad
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                En TABE, la calidad del contenido es nuestra prioridad absoluta. Cada plan de carrera y guía de estudio es revisado para asegurar su precisión y relevancia académica. Cumplimos con los estándares más estrictos de privacidad de datos y ética en inteligencia artificial, porque entendemos que la educación es la base de un futuro más justo y tecnológicamente avanzado.
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
