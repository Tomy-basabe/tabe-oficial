import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  const currentYear = new Date().getFullYear();

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
          <FileText className="w-16 h-16 text-neon-purple mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Términos de <span className="gradient-text">Servicio</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acuerdo legal para el uso de la plataforma TABE.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section className="card-gamer p-8 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Al acceder y utilizar TABE (Tu Asistente de Bolsillo Estudiantil), usted acepta cumplir y estar sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestra plataforma.
            </p>
          </section>

          <section className="card-gamer p-8 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">2. Uso de la Inteligencia Artificial</h2>
            <p className="text-muted-foreground leading-relaxed">
              TABE proporciona herramientas basadas en IA para ayudar en el estudio. Si bien nos esforzamos por la precisión, no garantizamos que el contenido generado por la IA sea 100% correcto. El usuario es responsable de verificar la información para sus fines académicos.
            </p>
          </section>

          <section className="card-gamer p-8 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">3. Cuentas y Seguridad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. TABE no se hace responsable por pérdidas resultantes del uso no autorizado de su cuenta. Las cuentas son personales e intransferibles.
            </p>
          </section>

          <section className="card-gamer p-8 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">4. Propiedad Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo el diseño, código, logotipos y contenido original de TABE son propiedad de sus creadores. El contenido subido por el usuario (apuntes, flashcards propias) sigue siendo propiedad del usuario, pero otorga a TABE una licencia para procesarlo con el fin de brindar el servicio.
            </p>
          </section>

          <section className="card-gamer p-8 rounded-2xl border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">5. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              TABE es una herramienta de apoyo educativo. No garantizamos resultados académicos específicos. El éxito en los estudios depende exclusivamente del esfuerzo del estudiante.
            </p>
          </section>

          <div className="text-center text-sm text-muted-foreground pt-8">
            Última actualización: Marzo {currentYear}
          </div>
        </div>
      </main>
    </div>
  );
}
