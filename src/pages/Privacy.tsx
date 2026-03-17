import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
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
                    <Shield className="w-16 h-16 text-neon-cyan mx-auto mb-6" />
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                        Políticas de <span className="gradient-text">Privacidad</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        El compromiso de TABE con tus datos y rendimiento académico.
                    </p>
                </div>

                <div className="prose prose-invert max-w-none space-y-8">
                    <div className="card-gamer p-8 rounded-2xl border border-border">
                        <h2 className="text-2xl font-bold mb-4 text-foreground">1. Recopilación de Información</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            En TABE (Tu Asistente de Bolsillo Estudiantil), recopilamos información personal necesaria para brindar nuestros servicios educativos, incluyendo pero no limitándose a: nombre, dirección de correo electrónico, progreso académico, materias cursadas e interacciones con nuestra inteligencia artificial. Utilizamos Google Analytics y sistemas de análisis propios para mejorar nuestra plataforma.
                        </p>
                    </div>

                    <div className="card-gamer p-8 rounded-2xl border border-border">
                        <h2 className="text-2xl font-bold mb-4 text-foreground">2. Uso de la Información</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            La información recopilada se utiliza exclusivamente para:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
                            <li>Personalizar tu experiencia de aprendizaje.</li>
                            <li>Generar métricas de estudio y proyecciones de rendimiento.</li>
                            <li>Proporcionar sugerencias de inteligencia artificial (generación de flashcards, resúmenes).</li>
                            <li>Mantener la seguridad y operación de la plataforma.</li>
                            <li>Mostrar publicidad relevante y medir su eficacia a través de plataformas como Google AdSense.</li>
                        </ul>
                    </div>

                    <div className="card-gamer p-8 rounded-2xl border border-border">
                        <h2 className="text-2xl font-bold mb-4 text-foreground">3. Publicidad y AdSense</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TABE trabaja con proveedores de publicidad, como Google, que utilizan cookies (incluida la cookie de DoubleClick) para publicar anuncios basados en las visitas previas de un usuario a nuestro sitio web o a otros sitios de Internet. El uso de cookies publicitarias permite a Google y a sus socios mostrar anuncios basados en las visitas realizadas a este y otros sitios.
                            Los usuarios pueden inhabilitar el uso de cookies para publicidad personalizada visitando la Configuración de anuncios de Google.
                        </p>
                    </div>

                    <div className="card-gamer p-8 rounded-2xl border border-border">
                        <h2 className="text-2xl font-bold mb-4 text-foreground">4. Cookies y Tecnologías Similares</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Utilizamos cookies esenciales y de análisis para asegurar que nuestra plataforma funcione correctamente y para entender cómo se utiliza nuestro servicio. Esto nos permite mejorar constantemente la experiencia del estudiante. Al navegar por TABE, usted acepta el uso de estas tecnologías.
                        </p>
                    </div>

                    <div className="card-gamer p-8 rounded-2xl border border-border">
                        <h2 className="text-2xl font-bold mb-4 text-foreground">5. Contacto sobre Privacidad</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Si tienes preguntas sobre nuestra política de privacidad o sobre el manejo de tus datos, puedes enviarnos un correo electrónico a <strong>soporte@tabe.com.ar</strong> o comunicarte a través de nuestra página de Contacto.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
