import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Shield,
  BookOpen,
  Scale,
  Brain,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Lock,
  Mail,
  Copy,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SectionItem {
  id: string;
  title: string;
  icon: any;
  badge: string;
}

const SECTIONS: SectionItem[] = [
  { id: "aceptacion", title: "1. Aceptación y Ámbito", icon: BookOpen, badge: "Contrato" },
  { id: "servicios-ia", title: "2. Asistencia por IA", icon: Brain, badge: "Uso Asistivo" },
  { id: "cuentas-seguridad", title: "3. Cuentas y Seguridad", icon: Lock, badge: "Acceso" },
  { id: "propiedad-intelectual", title: "4. Propiedad Intelectual y Apuntes", icon: FileText, badge: "Autoría" },
  { id: "marketplace", title: "5. Comunidad y Terceros", icon: ShoppingBag, badge: "Limitación" },
  { id: "uso-aceptable", title: "6. Uso Aceptable y Prohibiciones", icon: AlertTriangle, badge: "Reglas" },
  { id: "supresion-terminacion", title: "7. Supresión y Terminación", icon: UserCheck, badge: "Derechos" },
  { id: "ley-jurisdiccion", title: "8. Legislación y Contacto", icon: Scale, badge: "Jurisdicción" },
];

export default function Terms() {
  const [activeSection, setActiveSection] = useState<string>("aceptacion");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const copyLegalEmail = () => {
    navigator.clipboard.writeText("legal@tabe.com.ar");
    setCopiedEmail(true);
    toast.success("Correo legal copiado al portapapeles");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#BFFF00] selection:text-black">
      {/* Barra superior de navegación */}
      <nav className="border-b-4 border-foreground bg-card sticky top-0 z-50 shadow-[0_4px_0_0_hsl(var(--foreground))]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-foreground bg-card text-foreground font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Inicio</span>
            </Link>
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-foreground bg-[#BFFF00] text-black font-black text-xs uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
            >
              <span>Ir a la Plataforma</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xs uppercase tracking-wider bg-foreground text-background px-3 py-1 rounded-lg">
              Términos Oficiales
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="border-b-4 border-foreground bg-muted/30 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFE600] text-black font-black text-xs uppercase rounded-lg border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] mb-4">
            <Shield className="w-4 h-4" />
            <span>Condiciones Legales de Servicio</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-sm md:text-base font-bold text-muted-foreground max-w-3xl leading-relaxed">
            Este documento regula el acceso, la utilización de herramientas de inteligencia artificial, la publicación de apuntes estudiantiles y la comercialización o intercambio de material en TABE (Tu Asistente de Bolsillo Estudiantil).
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs font-black uppercase text-muted-foreground">
            <span className="bg-card px-2.5 py-1 rounded-md border-2 border-foreground text-foreground">
              Vigencia: Marzo {currentYear}
            </span>
            <span>•</span>
            <span className="bg-card px-2.5 py-1 rounded-md border-2 border-foreground text-foreground">
              Versión 2.8.0
            </span>
            <span>•</span>
            <Link to="/privacidad" className="text-[#0066FF] hover:underline underline-offset-2">
              Ver Política de Privacidad →
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido con Sidebar de Secciones */}
      <div className="container mx-auto max-w-6xl px-4 py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navegación lateral rápida */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="border-4 border-foreground bg-card rounded-2xl p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                <h3 className="font-black text-xs uppercase tracking-wider text-muted-foreground mb-3 px-1">
                  Índice de Cláusulas
                </h3>
                <nav className="space-y-1.5">
                  {SECTIONS.map((sec) => {
                    const Icon = sec.icon;
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-between border-2",
                          isActive
                            ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_#FFE600]"
                            : "border-transparent hover:border-foreground/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{sec.title}</span>
                        </span>
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0",
                            isActive ? "bg-[#FFE600] text-black" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {sec.badge}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Caja de Contacto Legal */}
              <div className="border-4 border-foreground bg-[#00E5FF]/10 rounded-2xl p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                <div className="flex items-center gap-2 mb-2 font-black text-xs uppercase">
                  <Mail className="w-4 h-4 text-[#0066FF]" />
                  <span>Mesa de Ayuda Legal</span>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground leading-relaxed mb-3">
                  Para consultas sobre derechos de autor, bajas DMCA o soporte normativo:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-bold bg-background px-2.5 py-1.5 rounded-lg border-2 border-foreground flex-1 truncate">
                    legal@tabe.com.ar
                  </code>
                  <button
                    type="button"
                    onClick={copyLegalEmail}
                    className="p-1.5 rounded-lg border-2 border-foreground bg-card hover:bg-muted transition-colors shrink-0"
                    title="Copiar email"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-[#48BD22]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Cuerpo principal de términos */}
          <main className="lg:col-span-8 space-y-8">
            {/* Cláusula 1 */}
            <section
              id="aceptacion"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#FF6600] mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Cláusula 1</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                1. Aceptación de los Términos y Ámbito
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  Bienvenido a <strong>TABE (Tu Asistente de Bolsillo Estudiantil)</strong>, plataforma desarrollada con el propósito de centralizar y potenciar la vida académica universitaria.
                </p>
                <p>
                  Al crear una cuenta, acceder mediante autenticación de terceros (ej. Google OAuth) o utilizar cualquiera de nuestros módulos interactivos, el usuario manifiesta su conformidad plena, informada y sin reservas con estos Términos y Condiciones, así como con nuestra <Link to="/privacidad" className="text-[#0066FF] underline font-black">Política de Privacidad</Link>. Si no está de acuerdo con la totalidad de estas cláusulas, deberá abstenerse de utilizar el servicio.
                </p>
              </div>
            </section>

            {/* Cláusula 2 */}
            <section
              id="servicios-ia"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#0066FF] mb-2">
                <Brain className="w-4 h-4" />
                <span>Cláusula 2</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                2. Herramientas de Inteligencia Artificial y Tutoría
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  TABE integra modelos de lenguaje avanzado (LLMs) para la generación automática de flashcards, cuestionarios de práctica, resúmenes bibliográficos y resolución orientativa de dudas académicas.
                </p>
                <div className="p-3.5 bg-muted/40 border-2 border-foreground rounded-xl text-foreground font-black text-xs">
                  ⚠️ <strong>Carácter Asistivo y Deber de Verificación:</strong> Las respuestas generadas por inteligencia artificial constituyen una ayuda orientativa de estudio y no reemplazan la bibliografía oficial de las cátedras universitarias ni el criterio del cuerpo docente. El estudiante asume la responsabilidad exclusiva de contrastar y validar cualquier información antes de rendir exámenes o presentar trabajos prácticos.
                </div>
              </div>
            </section>

            {/* Cláusula 3 */}
            <section
              id="cuentas-seguridad"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#FFCC00] mb-2">
                <Lock className="w-4 h-4" />
                <span>Cláusula 3</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                3. Cuentas de Usuario y Confidencialidad
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  Para acceder a las funcionalidades personalizadas, el usuario debe registrarse proporcionando información veraz. Cada cuenta es de uso estrictamente personal e intransferible.
                </p>
                <p>
                  El usuario es custodio único de la confidencialidad de su contraseña y de cualquier actividad originada bajo su sesión. TABE implementa estándares criptográficos modernos mediante Supabase Auth y Row Level Security (RLS) para resguardar la identidad del estudiante. Ante sospecha de acceso no autorizado, debe notificarse de inmediato a <code className="text-foreground">seguridad@tabe.com.ar</code>.
                </p>
              </div>
            </section>

            {/* Cláusula 4 */}
            <section
              id="propiedad-intelectual"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#48BD22] mb-2">
                <FileText className="w-4 h-4" />
                <span>Cláusula 4</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                4. Propiedad Intelectual y Apuntes Compartidos
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  <strong>a) Autoría Estudiantil:</strong> La titularidad de los derechos morales y patrimoniales sobre apuntes, notas, resúmenes y flashcards creados por el usuario pertenecen en todo momento al autor original.
                </p>
                <p>
                  <strong>b) Licencia No Exclusiva para la Operación del Servicio:</strong> Al cargar o redactar contenido en la plataforma, el usuario confiere a TABE una licencia mundial, libre de regalías, no exclusiva y revocable, con el único fin técnico de almacenar, renderizar, indexar y permitir la visualización conforme a la configuración de privacidad escogida (apunte privado, colaborativo o publicado en la comunidad).
                </p>
                <p>
                  <strong>c) Derecho de Revocación:</strong> El autor puede despublicar, modificar o eliminar sus apuntes en cualquier momento. Al eliminarse el recurso o la cuenta, este se suprime de los servidores de la plataforma de forma definitiva.
                </p>
              </div>
            </section>

            {/* Cláusula 5 */}
            <section
              id="marketplace"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#FF2E93] mb-2">
                <ShoppingBag className="w-4 h-4" />
                <span>Cláusula 5</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                5. Comunidad y Limitación de Responsabilidad de Terceros
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  <strong>a) Rol de Intermediario Técnico (Puerto Seguro):</strong> La Comunidad de TABE opera como un repositorio comunitario de intercambio entre estudiantes. TABE no supervisa de manera preliminar ni avala la exactitud, calidad, integridad o legalidad de los materiales compartidos por los usuarios.
                </p>
                <p>
                  <strong>b) Responsabilidad del Usuario Emisor:</strong> El usuario que comparte o comercializa un apunte garantiza ser el autor legítimo del material o contar con las autorizaciones pertinentes, respondiendo íntegramente por reclamos de terceros relativos a plagio o vulneración de copyright.
                </p>
                <p>
                  <strong>c) Procedimiento de Notificación y Retiro (Notice & Takedown):</strong> Si un titular de derechos detecta material no autorizado, puede enviar una solicitud a <code className="text-foreground">legal@tabe.com.ar</code> indicando el enlace y acreditando titularidad. TABE procederá al bloqueo o retiro cautelar en un plazo máximo de 48 horas hábiles.
                </p>
              </div>
            </section>

            {/* Cláusula 6 */}
            <section
              id="uso-aceptable"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#FF5C5C] mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Cláusula 6</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                6. Reglas de Uso Aceptable y Prohibiciones
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>Queda expresamente prohibido:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-foreground font-extrabold text-xs">
                  <li>Subir o comercializar exámenes filtrados, copias ilegales de libros de texto con derecho de autor reservado o material confidencial no público.</li>
                  <li>Realizar ingeniería inversa, scraping masivo, descompilación o vulneración de los sistemas de seguridad de la API o la base de datos de TABE.</li>
                  <li>Inyectar código malicioso, scripts XSS, ataques de denegación de servicio (DoS) o saturación intencional de servidores.</li>
                  <li>Incurrir en acoso, difamación, suplantación de identidad o discriminación en salas de estudio o canales de comunicación.</li>
                </ul>
                <p>
                  El incumplimiento faculta a TABE a suspender de inmediato la cuenta y dar de baja los contenidos infractores sin derecho a reembolso.
                </p>
              </div>
            </section>

            {/* Cláusula 7 */}
            <section
              id="supresion-terminacion"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-[#00E5FF] mb-2">
                <UserCheck className="w-4 h-4" />
                <span>Cláusula 7</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                7. Supresión de Cuenta y Derecho al Olvido
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  De conformidad con la Ley 25.326 y normas internacionales de protección de datos, todo estudiante goza del derecho inalienable de eliminar su cuenta en cualquier momento.
                </p>
                <p>
                  El procedimiento puede ejecutarse de manera autónoma desde la sección de <Link to="/configuracion" className="text-[#0066FF] underline font-black">Configuración</Link> utilizando la función "Eliminar mi cuenta y todos mis datos", la cual ejecuta una purga integral en cascada de registros, archivos en Storage y credenciales de autenticación.
                </p>
              </div>
            </section>

            {/* Cláusula 8 */}
            <section
              id="ley-jurisdiccion"
              className="border-4 border-foreground bg-card rounded-2xl p-6 md:p-8 shadow-[6px_6px_0_0_hsl(var(--foreground))]"
            >
              <div className="flex items-center gap-2.5 text-xs font-black uppercase text-foreground mb-2">
                <Scale className="w-4 h-4" />
                <span>Cláusula 8</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
                8. Legislación Aplicable y Jurisdicción
              </h2>
              <div className="space-y-3 text-xs md:text-sm font-bold text-muted-foreground leading-relaxed">
                <p>
                  Estos Términos y Condiciones se rigen e interpretan bajo las leyes de la República Argentina. Cualquier controversia derivada del uso de la plataforma será sometida a los tribunales ordinarios competentes de la Ciudad de Buenos Aires, con renuncia expresa a cualquier otro fuero o jurisdicción.
                </p>
                <div className="pt-4 border-t-2 border-border text-center text-xs font-black uppercase text-muted-foreground">
                  © {currentYear} TABE Software • Todos los derechos reservados.
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
