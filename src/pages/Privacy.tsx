import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Database,
  Brain,
  Cookie,
  Server,
  FileText,
  UserCheck,
  AlertTriangle,
  Mail,
  Scale,
  CheckCircle2,
  ExternalLink,
  Search,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  title: string;
  icon: any;
  badge: string;
}

const SECTIONS: SectionItem[] = [
  { id: "introduccion", title: "1. Introducción y Alcance", icon: BookOpen, badge: "General" },
  { id: "marco-legal", title: "2. Marco Legal y Cumplimiento", icon: Scale, badge: "Ley 25.326" },
  { id: "principios", title: "3. Principios de Protección", icon: CheckCircle2, badge: "Garantías" },
  { id: "datos-recopilados", title: "4. Datos que Recopilamos", icon: Database, badge: "Inventario" },
  { id: "finalidades", title: "5. Finalidades del Tratamiento", icon: Eye, badge: "Objetivos" },
  { id: "inteligencia-artificial", title: "6. Tratamiento con Inteligencia Artificial (IA)", icon: Brain, badge: "IA & LLMs" },
  { id: "publicidad-cookies", title: "7. Cookies y Redes Publicitarias", icon: Cookie, badge: "Monetización" },
  { id: "seguridad", title: "8. Seguridad y Cifrado", icon: Lock, badge: "Ciberseguridad" },
  { id: "retencion", title: "9. Retención y Purgado de Datos", icon: Server, badge: "Ciclo de Vida" },
  { id: "transferencias", title: "10. Transferencias Internacionales", icon: ExternalLink, badge: "Cloud" },
  { id: "derechos-arco", title: "11. Derechos ARCO y Portabilidad", icon: UserCheck, badge: "Tus Derechos" },
  { id: "contacto-cambios", title: "12. Modificaciones y Contacto", icon: Mail, badge: "Soporte Legal" },
];

export default function Privacy() {
  const [activeSection, setActiveSection] = useState<string>("introduccion");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.badge.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-[#BFFF00] selection:text-black">
      {/* Barra de navegación superior */}
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
            <span className="font-black text-sm uppercase tracking-wider bg-foreground text-background px-2.5 py-1 rounded-lg">
              TABE Legal
            </span>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="border-b-4 border-foreground bg-[#FFD700] text-black py-12 lg:py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                <Shield className="w-4 h-4 text-[#00E5FF]" />
                <span>Documento Oficial de Transparencia</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none text-black">
                Política Integral de Privacidad y Protección de Datos
              </h1>
              <p className="text-base md:text-lg font-bold text-black/90 leading-snug">
                Marco reglamentario, gobernanza de datos académicos, inferencia segura de Inteligencia Artificial y garantías conforme a la Ley N° 25.326 y estándares internacionales (RGPD / GDPR).
              </p>
            </div>
            <div className="bg-card text-foreground p-4 rounded-2xl border-4 border-black shadow-[6px_6px_0_0_#000] shrink-0 w-full md:w-auto">
              <div className="text-xs font-black uppercase text-muted-foreground">Versión Oficial</div>
              <div className="text-lg font-black text-foreground">v3.4 (Completa)</div>
              <div className="text-xs font-bold text-muted-foreground mt-1">
                Última auditoría: 8 de Septiembre de 2026
              </div>
              <div className="mt-3 pt-3 border-t-2 border-foreground/20 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  En vigencia activa
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal con Sidebar de navegación */}
      <div className="container mx-auto max-w-6xl px-4 py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navegación lateral (Desktop) */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="sticky top-24 bg-card border-4 border-foreground rounded-2xl p-4 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-foreground/15">
                <span className="font-black text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Tabla de Contenidos
                </span>
                <span className="text-[10px] font-black bg-[#00E5FF] text-black px-1.5 py-0.5 rounded">
                  12 Secciones
                </span>
              </div>

              {/* Buscador de secciones */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar en el índice legal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border-2 border-foreground text-xs font-bold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Lista interactiva */}
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                {filteredSections.map((sec) => {
                  const Icon = sec.icon;
                  const isCurrent = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left text-xs font-black transition-all border-2 cursor-pointer",
                        isCurrent
                          ? "bg-foreground text-background border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                          : "bg-background text-foreground border-foreground/20 hover:border-foreground/80 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sec.title}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded font-black uppercase shrink-0 border",
                          isCurrent
                            ? "bg-background text-foreground border-transparent"
                            : "bg-muted text-muted-foreground border-foreground/15"
                        )}
                      >
                        {sec.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Cuadro de contacto rápido de privacidad */}
              <div className="p-3 bg-[#BFFF00]/20 border-2 border-foreground rounded-xl space-y-2 text-xs">
                <div className="font-black text-black uppercase flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Oficina de Privacidad
                </div>
                <p className="font-bold text-muted-foreground leading-relaxed text-[11px]">
                  Para ejercer derechos ARCO o consultas sobre tus datos:
                </p>
                <a
                  href="mailto:privacidad@tabe.software"
                  className="block font-black text-primary hover:underline truncate"
                >
                  privacidad@tabe.software
                </a>
              </div>
            </div>
          </aside>

          {/* Cuerpo principal de los artículos */}
          <main className="lg:col-span-8 space-y-8">
            {/* SECCIÓN 1 */}
            <section
              id="introduccion"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00E5FF] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 1
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Introducción, Alcance y Responsable del Tratamiento
                  </h2>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-muted-foreground text-sm leading-relaxed">
                <p>
                  Bienvenido a <strong>TABE (Tu Asistente de Bolsillo Estudiantil)</strong>, operado y desarrollado por TABE Software (en adelante, indistintamente «TABE», «la Plataforma», «nosotros» o «nuestro»). La presente Política de Privacidad constituye un contrato vinculante y describe de forma transparente, minuciosa y completa los procedimientos relativos a la recopilación, almacenamiento, tratamiento, procesamiento, seguridad, transferencia y supresión de la información personal de los usuarios («el Usuario», «el Estudiante» o «usted»).
                </p>
                <p>
                  Esta política aplica de forma irrestricta a todo acceso, navegación, registro o uso de nuestros servicios web a través de los dominios oficiales <code>tabe.software</code>, <code>tabe.com.ar</code>, aplicaciones web progresivas (PWA), canales de mensajería integrados, extensiones y servicios conexos.
                </p>
                <div className="p-4 bg-muted/60 border-2 border-foreground rounded-xl text-foreground font-bold space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Datos del Responsable:</div>
                  <div><strong>Denominación:</strong> TABE — Tu Asistente de Bolsillo Estudiantil</div>
                  <div><strong>Finalidad:</strong> Plataforma integral de gestión universitaria, gamificación académica y tutoría con Inteligencia Artificial.</div>
                  <div><strong>Contacto Legal & DPO:</strong> <code>privacidad@tabe.software</code> | <code>soporte@tabe.software</code></div>
                  <div><strong>Sede Operativa:</strong> República Argentina.</div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2 */}
            <section
              id="marco-legal"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#BFFF00] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 2
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Marco Legal Aplicable y Cumplimiento Normativo
                  </h2>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-muted-foreground text-sm leading-relaxed">
                <p>
                  El tratamiento de datos personales en TABE se rige prioritariamente por la legislación de la República Argentina y complementariamente por las directrices internacionales más exigentes en materia de privacidad digital:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-foreground">
                  <li>
                    <strong>Ley N° 25.326 de Protección de Datos Personales (República Argentina):</strong> Cumplimiento pleno de sus principios generales, registro de bases de datos, deber de confidencialidad y garantía irrestricta de los derechos de acceso, rectificación, actualización y supresión de datos.
                  </li>
                  <li>
                    <strong>Decreto Reglamentario N° 1558/2001 y Resoluciones de la AAIP:</strong> Lineamientos técnicos emitidos por la Agencia de Acceso a la Información Pública (órgano de control nacional de la Ley 25.326).
                  </li>
                  <li>
                    <strong>Reglamento General de Protección de Datos (RGPD / GDPR - UE 2016/679):</strong> En lo relativo a estudiantes internacionales o residentes en la Unión Europea, garantizando licitud, portabilidad de datos, consentimiento granular y derecho al olvido.
                  </li>
                  <li>
                    <strong>Children’s Online Privacy Protection Act (COPPA):</strong> Restricción de acceso para menores de 13 años sin autorización expresa de padres o tutores legales.
                  </li>
                </ul>
              </div>
            </section>

            {/* SECCIÓN 3 */}
            <section
              id="principios"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF7759] text-white border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 3
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Principios Rectores de la Protección de Datos
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">
                <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl space-y-1">
                  <div className="text-primary font-black uppercase">Principio de Licitud y Lealtad</div>
                  <p className="text-muted-foreground">Los datos se recopilan únicamente por medios legítimos y con el consentimiento libre e informado del usuario.</p>
                </div>
                <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl space-y-1">
                  <div className="text-primary font-black uppercase">Finalidad Delimitada</div>
                  <p className="text-muted-foreground">Los datos se usan única y exclusivamente para los fines educativos y de soporte declarados, sin desvíos ulteriores.</p>
                </div>
                <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl space-y-1">
                  <div className="text-primary font-black uppercase">Minimización de Datos</div>
                  <p className="text-muted-foreground">Solo solicitamos la información estrictamente necesaria para brindar la experiencia de estudio y métricas.</p>
                </div>
                <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl space-y-1">
                  <div className="text-primary font-black uppercase">Exactitud y Calidad</div>
                  <p className="text-muted-foreground">Proveemos herramientas continuas para que el estudiante actualice sus materias, notas y agenda en cualquier momento.</p>
                </div>
                <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl space-y-1">
                  <div className="text-primary font-black uppercase">Confidencialidad Rigurosa</div>
                  <p className="text-muted-foreground">Acceso estrictamente restringido mediante Row Level Security (RLS). Nadie más puede ver tus apuntes ni tus notas.</p>
                </div>
                <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl space-y-1">
                  <div className="text-primary font-black uppercase">Seguridad Técnica Activa</div>
                  <p className="text-muted-foreground">Cifrado de grado bancario en tránsito (TLS 1.3) y en reposo (AES-256) en servidores de clase empresarial.</p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 4 */}
            <section
              id="datos-recopilados"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#D18EE2] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 4
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Inventario Exhaustivo de Datos Personales Recopilados
                  </h2>
                </div>
              </div>

              <div className="space-y-4 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  Para garantizar la operatividad de TABE, se recopilan y estructuran las siguientes tipologías de información:
                </p>

                <div className="space-y-3">
                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      A. Datos de Identificación y Cuenta
                    </h3>
                    <p className="text-xs">
                      Nombre completo o seudónimo, dirección de correo electrónico verificado, imagen de perfil o avatar elegido, credenciales de autenticación cifradas (hashes criptográficos irreversibles con salting administrados por Supabase Auth) y datos de vinculación federada OAuth (como Google Account ID si se ingresa con Google).
                    </p>
                  </div>

                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      B. Datos Académicos y Registro Curricular
                    </h3>
                    <p className="text-xs">
                      Institución universitaria o terciaria, facultad, carrera cursada, plan de estudios seleccionado, materias registradas, estado de cursada de cada materia (aprobada con examen final, cursada regularizada, libre, en curso), calificaciones numéricas y conceptuales de exámenes parciales, recuperatorios y finales, y fechas de vencimiento de regularidad.
                    </p>
                  </div>

                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      C. Datos de Planificación, Calendario y Eventos
                    </h3>
                    <p className="text-xs">
                      Fechas y horarios de exámenes, entregas de trabajos prácticos, recordatorios de estudio, bloques de concentración Pomodoro, alarmas académicas y metadatos de sincronización con calendarios externos (.ics o Google Calendar).
                    </p>
                  </div>

                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      D. Contenido del Estudiante (Apuntes, Flashcards y Documentos)
                    </h3>
                    <p className="text-xs">
                      Archivos de texto y PDFs subidos para procesamiento, contenido de apuntes y notas creadas en el editor (bloques Notion-style, títulos, textos, ecuaciones matemáticas en KaTeX), mazos de flashcards con sus preguntas y respuestas, y estadísticas del algoritmo de repetición espaciada (intervalos de repaso, factor de facilidad y aciertos).
                    </p>
                  </div>

                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      E. Interacciones con Inteligencia Artificial
                    </h3>
                    <p className="text-xs">
                      Consultas formuladas al tutor de IA, personalidades de IA creadas o seleccionadas, modelo de lenguaje seleccionado (Gemini, Claude, GPT, DeepSeek, etc.), nivel de esfuerzo o potencia elegido, historial de conversaciones y acciones automatizadas ejecutadas (como agendar fechas de examen o compilar flashcards solicitadas expresamente por el usuario).
                    </p>
                  </div>

                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      F. Datos de Gamificación y Social
                    </h3>
                    <p className="text-xs">
                      Puntos de experiencia (XP), nivel del usuario, monedas virtuales de la plataforma, rachas de días seguidos de estudio (streaks), logros desbloqueados, estadísticas de minijuegos educativos (Ajedrez, Carrera de Karts, Batallas RPG), listas de amigos agregados mediante código y mensajes enviados en salas de estudio en vivo (Room Chat).
                    </p>
                  </div>

                  <div className="p-4 border-2 border-foreground/40 rounded-xl bg-background">
                    <h3 className="font-black text-foreground uppercase text-xs mb-1">
                      G. Datos Técnicos, Dispositivo y Telemática
                    </h3>
                    <p className="text-xs">
                      Dirección IP anonimizada, tipo de navegador web, resolución de pantalla, sistema operativo, idioma de preferencia, identificador de instalación PWA, registros de rendimiento y reporte de errores anónimos para la estabilidad del software.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 5 */}
            <section
              id="finalidades"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00E5FF] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 5
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Finalidades y Bases Jurídicas del Tratamiento
                  </h2>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  Cada operación de tratamiento de datos responde a una base jurídica válida conforme al artículo 5 y 6 de la Ley 25.326 y al artículo 6 del RGPD:
                </p>

                <div className="overflow-x-auto border-2 border-foreground rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-foreground text-background font-black uppercase">
                        <th className="p-2.5">Finalidad del Tratamiento</th>
                        <th className="p-2.5">Datos Utilizados</th>
                        <th className="p-2.5">Base Jurídica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/20 font-bold text-foreground">
                      <tr className="hover:bg-muted/40">
                        <td className="p-2.5">Gestión de cuenta y autenticación segura</td>
                        <td className="p-2.5 text-muted-foreground">Email, contraseña cifrada, nombre</td>
                        <td className="p-2.5 text-emerald-600 dark:text-emerald-400">Ejecución del contrato</td>
                      </tr>
                      <tr className="hover:bg-muted/40">
                        <td className="p-2.5">Cálculo de correlatividades y métricas académicas</td>
                        <td className="p-2.5 text-muted-foreground">Materias, notas, plan de estudio</td>
                        <td className="p-2.5 text-emerald-600 dark:text-emerald-400">Ejecución del contrato</td>
                      </tr>
                      <tr className="hover:bg-muted/40">
                        <td className="p-2.5">Tutoría académica con Inteligencia Artificial</td>
                        <td className="p-2.5 text-muted-foreground">Prompts, contexto académico mínimo</td>
                        <td className="p-2.5 text-blue-600 dark:text-blue-400">Consentimiento expreso</td>
                      </tr>
                      <tr className="hover:bg-muted/40">
                        <td className="p-2.5">Gamificación, logros y leaderboards opcionales</td>
                        <td className="p-2.5 text-muted-foreground">XP, rachas, partidas en minijuegos</td>
                        <td className="p-2.5 text-purple-600 dark:text-purple-400">Consentimiento voluntario</td>
                      </tr>
                      <tr className="hover:bg-muted/40">
                        <td className="p-2.5">Sostenimiento publicitario no invasivo (AdSense)</td>
                        <td className="p-2.5 text-muted-foreground">Cookies analíticas y publicitarias</td>
                        <td className="p-2.5 text-amber-600 dark:text-amber-400">Interés legítimo / Consentimiento</td>
                      </tr>
                      <tr className="hover:bg-muted/40">
                        <td className="p-2.5">Seguridad informática y prevención de abusos</td>
                        <td className="p-2.5 text-muted-foreground">IP anonimizada, logs de auditoría</td>
                        <td className="p-2.5 text-red-600 dark:text-red-400">Obligación legal / Interés legítimo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* SECCIÓN 6 */}
            <section
              id="inteligencia-artificial"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#8B5CF6] text-white border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 6
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Régimen Específico de Inteligencia Artificial (IA) y Modelos LLM
                  </h2>
                </div>
              </div>

              <div className="space-y-4 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  TABE integra capacidades avanzadas de Inteligencia Artificial para actuar como un tutor personalizado que responde dudas conceptuales, genera resúmenes didácticos y confecciona mazos de estudio. El tratamiento de datos en este subsistema está sujeto a las siguientes cláusulas estrictas:
                </p>

                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xl space-y-2 text-foreground">
                  <div className="font-black text-xs uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Garantía de No-Entrenamiento con Datos Privados
                  </div>
                  <p className="text-xs leading-relaxed">
                    <strong>Tus conversaciones, apuntes y consultas académicas jamás son utilizadas para entrenar, reentrenar ni ajustar modelos públicos de IA.</strong> Las consultas enviadas a los proveedores de inferencia (Google Gemini API y OpenRouter) se procesan bajo acuerdos comerciales de API con políticas de retención cero («zero-data retention for training»), garantizando que el contenido del estudiante permanezca privado y estrictamente confidencial.
                  </p>
                </div>

                <ul className="list-disc pl-5 space-y-2 text-foreground text-xs">
                  <li>
                    <strong>Proveedores Certificados de Inferencia:</strong> Las consultas se canalizan de forma cifrada (HTTPS/TLS 1.3) hacia los servidores oficiales de Google Cloud (Gemini) y OpenRouter (incluyendo modelos de Anthropic, OpenAI, DeepSeek, Meta, Mistral, Cohere, Liquid AI y Qwen).
                  </li>
                  <li>
                    <strong>Minimización del Contexto:</strong> Al interactuar con la IA, solo se le remite el contexto estrictamente indispensable para responder con rigor pedagógico (por ejemplo: las materias que estás cursando o la fecha de un examen si solicitaste agendarlo).
                  </li>
                  <li>
                    <strong>Filtrado Riguroso de Razonamiento:</strong> Se implementan filtros en tiempo de streaming para garantizar que los modelos devuelvan única y exclusivamente la respuesta didáctica solicitada, purgando cualquier traza o monólogo interno.
                  </li>
                  <li>
                    <strong>Descargo de Responsabilidad Pedagógica:</strong> La IA constituye un instrumento de apoyo complementario. Las respuestas pueden contener imprecisiones o alucinaciones matemáticas/conceptuales. El estudiante asume la responsabilidad de verificar críticamente la información con la bibliografía oficial de su cátedra docente.
                  </li>
                </ul>
              </div>
            </section>

            {/* SECCIÓN 7 */}
            <section
              id="publicidad-cookies"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#F59E0B] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Cookie className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 7
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Cookies, Almacenamiento Local y Redes Publicitarias
                  </h2>
                </div>
              </div>

              <div className="space-y-4 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  Para mantener la gratuidad y el acceso abierto a la plataforma para miles de estudiantes universitarios, TABE utiliza un modelo de monetización apoyado en publicidad digital no invasiva y tecnologías de almacenamiento local.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-3 border-2 border-foreground/30 rounded-xl bg-background">
                    <strong className="text-foreground uppercase block mb-1">1. Cookies Estrictamente Necesarias y Técnicas</strong>
                    <p>
                      Utilizadas para mantener la sesión abierta (tokens JWT cifrados en Supabase), recordar el modo oscuro/claro, permitir el funcionamiento offline mediante Service Workers y almacenar temporalmente el borrador de tus apuntes en <code>LocalStorage</code> / <code>IndexedDB</code>. Estas cookies no requieren consentimiento previo al ser indispensables para la prestación del servicio.
                    </p>
                  </div>

                  <div className="p-3 border-2 border-foreground/30 rounded-xl bg-background">
                    <strong className="text-foreground uppercase block mb-1">2. Google AdSense y Redes Asociadas</strong>
                    <p>
                      Trabajamos con proveedores de publicidad digital como Google AdSense y Adsterra. Google utiliza cookies (como la cookie de DoubleClick) para publicar anuncios basados en las visitas previas del usuario a este o a otros sitios de Internet. Esto permite mostrar avisos contextualmente relevantes y prevenir fraudes por clics repetitivos.
                    </p>
                  </div>

                  <div className="p-3 border-2 border-foreground/30 rounded-xl bg-background">
                    <strong className="text-foreground uppercase block mb-1">3. Cómo Configurar o Inhabilitar las Cookies (Opt-Out)</strong>
                    <p className="mb-2">
                      Puedes revocar o personalizar tu consentimiento sobre la publicidad personalizada en cualquier momento mediante las siguientes vías oficiales:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Configuración de Anuncios de Google:{" "}
                        <a
                          href="https://adssettings.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-black underline"
                        >
                          adssettings.google.com
                        </a>
                      </li>
                      <li>
                        Iniciativa de Publicidad en Red (NAI):{" "}
                        <a
                          href="https://optout.networkadvertising.org"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-black underline"
                        >
                          optout.networkadvertising.org
                        </a>
                      </li>
                      <li>
                        Desde la configuración de tu navegador (Chrome, Edge, Firefox, Safari) bloqueando cookies de terceros.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 8 */}
            <section
              id="seguridad"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#10B981] text-white border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 8
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Seguridad Informática, Cifrado y Salvaguardas Técnicas
                  </h2>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  TABE implementa defensas técnicas, físicas y organizacionales proporcionales al estado del arte para proteger los datos frente a accesos no autorizados, pérdida, alteración o divulgación:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-foreground">
                  <div className="p-3 bg-secondary/30 border-2 border-foreground/20 rounded-xl">
                    <strong className="block text-primary uppercase mb-1">Cifrado de Extremo a Extremo</strong>
                    Toda comunicación entre tu navegador y nuestros servidores viaja cifrada mediante protocolos TLS 1.3 con soporte forzado de HSTS.
                  </div>
                  <div className="p-3 bg-secondary/30 border-2 border-foreground/20 rounded-xl">
                    <strong className="block text-primary uppercase mb-1">Row Level Security (RLS)</strong>
                    Nuestra base de datos PostgreSQL en Supabase aplica reglas a nivel de fila: un usuario solo puede leer y escribir sus propios registros.
                  </div>
                  <div className="p-3 bg-secondary/30 border-2 border-foreground/20 rounded-xl">
                    <strong className="block text-primary uppercase mb-1">Cifrado en Reposo</strong>
                    Las tablas y discos de almacenamiento se encuentran cifrados bajo el estándar militar AES-256 en centros de datos con certificación ISO 27001 y SOC 2.
                  </div>
                  <div className="p-3 bg-secondary/30 border-2 border-foreground/20 rounded-xl">
                    <strong className="block text-primary uppercase mb-1">Protocolo ante Incidentes</strong>
                    En caso de detectarse una vulneración de seguridad que afecte datos personales, se notificará a los usuarios afectados y a la autoridad de control en un plazo máximo de 72 horas.
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 9 */}
            <section
              id="retencion"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#6366F1] text-white border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 9
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Conservación, Retención y Purgado Definitivo
                  </h2>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  Los datos personales se conservan únicamente durante el tiempo estrictamente necesario para prestar el servicio o cumplir con obligaciones legales:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-foreground">
                  <li>
                    <strong>Cuentas Activas:</strong> La información académica, notas, apuntes y configuraciones se conservan mientras la cuenta permanezca activa para que el estudiante mantenga su historial durante toda su carrera.
                  </li>
                  <li>
                    <strong>Cuentas Inactivas:</strong> Las cuentas sin ningún inicio de sesión por más de veinticuatro (24) meses consecutivos serán notificadas previamente por email y, en caso de no registrar actividad, podrán ser archivadas o eliminadas de forma segura.
                  </li>
                  <li>
                    <strong>Eliminación por el Usuario:</strong> Cuando un usuario solicita la baja o eliminación de su cuenta desde el panel de Configuración o vía correo electrónico, todos sus datos personales, apuntes y registros vinculados son eliminados de forma irrevocable en un plazo máximo de 30 días corridos.
                  </li>
                </ul>
              </div>
            </section>

            {/* SECCIÓN 10 */}
            <section
              id="transferencias"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#EC4899] text-white border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 10
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Transferencias Internacionales de Datos y Terceros
                  </h2>
                </div>
              </div>

              <div className="space-y-3 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  Para proveer alta disponibilidad, baja latencia y procesamiento en la nube, TABE contrata proveedores tecnológicos internacionales de primer nivel:
                </p>
                <div className="p-3 bg-muted/50 border-2 border-foreground/20 rounded-xl space-y-2 text-xs text-foreground">
                  <div>• <strong>Supabase Inc. (EE.UU. / AWS):</strong> Alojamiento de bases de datos PostgreSQL, autenticación y almacenamiento de archivos bajo acuerdos de protección de datos (DPA).</div>
                  <div>• <strong>Google Cloud Platform & Google AI (EE.UU.):</strong> Servicios de infraestructura, analítica y modelos fundacionales Gemini.</div>
                  <div>• <strong>Vercel Inc. (EE.UU.):</strong> Alojamiento y distribución global edge del frontend web y PWA.</div>
                  <div>• <strong>OpenRouter / Proveedores de Inferencia (EE.UU. / UE):</strong> Enrutamiento seguro para modelos de IA alternativos.</div>
                </div>
                <p className="text-xs">
                  Dichas transferencias se encuentran amparadas por Cláusulas Contractuales Tipo (Standard Contractual Clauses - SCC) y los estándares de seguridad exigidos por el artículo 12 de la Ley N° 25.326.
                </p>
              </div>
            </section>

            {/* SECCIÓN 11 */}
            <section
              id="derechos-arco"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#BFFF00] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 11
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Tus Derechos Legales (ARCO, Portabilidad y Supresión)
                  </h2>
                </div>
              </div>

              <div className="space-y-4 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  En cumplimiento con la Ley N° 25.326 (Artículos 14 a 17) y el RGPD, usted cuenta con los siguientes derechos inalienables sobre sus datos personales:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold text-foreground">
                  <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl">
                    <strong className="text-primary uppercase block mb-1">Derecho de Acceso</strong>
                    Solicitar información gratuita sobre qué datos personales suyos se encuentran registrados en nuestras bases de datos en intervalos no menores a seis meses.
                  </div>
                  <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl">
                    <strong className="text-primary uppercase block mb-1">Derecho de Rectificación</strong>
                    Corregir o actualizar cualquier dato erróneo, desactualizado o incompleto (por ejemplo, corregir la nota de un examen o cambiar de carrera).
                  </div>
                  <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl">
                    <strong className="text-primary uppercase block mb-1">Derecho de Supresión ("Al Olvido")</strong>
                    Solicitar la eliminación total de su cuenta y borrado permanente de todos los registros personales asociados.
                  </div>
                  <div className="p-3 bg-secondary/40 border-2 border-foreground/30 rounded-xl">
                    <strong className="text-primary uppercase block mb-1">Derecho de Portabilidad</strong>
                    Descargar una copia estructurada de sus apuntes, flashcards y eventos en formatos estándar interoperables (JSON / Markdown / ICS).
                  </div>
                </div>

                <div className="p-4 bg-[#FFD700]/20 border-2 border-foreground rounded-xl text-xs space-y-2 text-foreground">
                  <div className="font-black uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Plazos Legales de Respuesta y Órgano de Control
                  </div>
                  <p>
                    Conforme al Art. 14 de la Ley 25.326, los pedidos de <strong>acceso</strong> serán respondidos dentro de los <strong>diez (10) días corridos</strong> de recibida la solicitud; las peticiones de <strong>rectificación, actualización o supresión</strong> serán ejecutadas dentro de los <strong>cinco (5) días hábiles</strong>.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    La <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>, Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales. Domicilio: Av. Pte. Gral. Julio A. Roca 710, piso 3°, Ciudad Autónoma de Buenos Aires. Sitio web:{" "}
                    <a
                      href="https://www.argentina.gob.ar/aaip"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-black underline"
                    >
                      argentina.gob.ar/aaip
                    </a>.
                  </p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 12 */}
            <section
              id="contacto-cambios"
              className="p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00E5FF] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Sección 12
                  </span>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                    Modificaciones de la Política y Canales Oficiales
                  </h2>
                </div>
              </div>

              <div className="space-y-4 font-semibold text-sm text-muted-foreground leading-relaxed">
                <p>
                  TABE se reserva el derecho de actualizar o modificar la presente Política de Privacidad para reflejar cambios legislativos, mejoras tecnológicas o nuevas funcionalidades de la plataforma. Ante cualquier modificación sustancial, se notificará a los usuarios a través de un aviso destacado en la plataforma o mediante correo electrónico con al menos quince (15) días de antelación a su entrada en vigencia.
                </p>

                <div className="p-4 bg-muted/60 border-2 border-foreground rounded-xl text-foreground font-bold space-y-2 text-xs">
                  <div className="uppercase text-muted-foreground tracking-wider font-black">
                    Canales Exclusivos de Atención en Privacidad:
                  </div>
                  <div>📧 Correo de Privacidad: <a href="mailto:privacidad@tabe.software" className="text-primary underline font-black">privacidad@tabe.software</a></div>
                  <div>📧 Soporte Técnico General: <a href="mailto:soporte@tabe.software" className="text-primary underline font-black">soporte@tabe.software</a></div>
                  <div>🌐 Sitio Web Oficial: <a href="https://tabe.software" className="text-primary underline font-black">https://tabe.software</a></div>
                </div>

                <p className="text-xs text-muted-foreground italic text-center pt-2">
                  El uso continuado de TABE tras la publicación de modificaciones a esta política implicará la aceptación plena e incondicional de los términos actualizados.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Footer legal */}
      <footer className="border-t-4 border-foreground bg-card py-8 px-4 text-center text-xs font-bold text-muted-foreground space-y-2">
        <div>
          © {new Date().getFullYear()} TABE — Tu Asistente de Bolsillo Estudiantil. Todos los derechos reservados.
        </div>
        <div className="flex items-center justify-center gap-4 text-foreground font-black uppercase text-[11px]">
          <Link to="/privacidad" className="hover:underline text-primary">Políticas de Privacidad</Link>
          <span>•</span>
          <Link to="/terminos" className="hover:underline">Términos de Servicio</Link>
          <span>•</span>
          <Link to="/contacto" className="hover:underline">Contacto</Link>
        </div>
      </footer>
    </div>
  );
}
