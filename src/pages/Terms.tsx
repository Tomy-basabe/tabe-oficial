import { Link } from "react-router-dom";
import { LegalLayout } from "@/components/legal/LegalLayout";
import {
  ArrowLeft,
  FileText,
  Shield,
  BookOpen,
  Globe,
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
  { id: "visores-externos", title: "6. Enlaces Externos y «Mi Campus»", icon: Globe, badge: "Deslinde Legal" },
  { id: "uso-aceptable", title: "7. Uso Aceptable y Prohibiciones", icon: AlertTriangle, badge: "Reglas" },
  { id: "supresion-terminacion", title: "8. Supresión y Terminación", icon: UserCheck, badge: "Derechos" },
  { id: "ley-jurisdiccion", title: "9. Legislación y Contacto", icon: Scale, badge: "Jurisdicción" },
];

export default function Terms() {
  const currentYear = new Date().getFullYear();

  return (
    <LegalLayout
      title="Términos y Condiciones de Uso"
      intro="Reglas de acceso y uso de TABE: herramientas de inteligencia artificial, publicación de apuntes y participación en la comunidad estudiantil."
      meta={[`Vigencia: marzo ${currentYear}`, "Versión 2.8.0"]}
      sections={SECTIONS}
      contactLabel="Mesa de ayuda legal"
      contactEmail="legal@tabe.com.ar"
      related={{ to: "/privacidad", label: "Ver Política de Privacidad" }}
    >

            {/* Cláusula 1 */}
            <section id="aceptacion" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 1</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">1. Aceptación de los Términos y Ámbito</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
                <p>
                  Bienvenido a <strong>TABE (Tu Asistente de Bolsillo Estudiantil)</strong>, plataforma desarrollada con el propósito de centralizar y potenciar la vida académica universitaria.
                </p>
                <p>
                  Al crear una cuenta, acceder mediante autenticación de terceros (ej. Google OAuth) o utilizar cualquiera de nuestros módulos interactivos, el usuario manifiesta su conformidad plena, informada y sin reservas con estos Términos y Condiciones, así como con nuestra <Link to="/privacidad" className="text-primary underline font-semibold">Política de Privacidad</Link>. Si no está de acuerdo con la totalidad de estas cláusulas, deberá abstenerse de utilizar el servicio.
                </p>
              </div>
            </section>

            {/* Cláusula 2 */}
            <section id="servicios-ia" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 2</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">2. Herramientas de Inteligencia Artificial y Tutoría</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
                <p>
                  TABE integra modelos de lenguaje avanzado (LLMs) para la generación automática de flashcards, cuestionarios de práctica, resúmenes bibliográficos y resolución orientativa de dudas académicas.
                </p>
                <div className="p-3.5 bg-muted/40 border border-border/70 rounded-xl text-foreground font-semibold text-xs">
                  <strong>Carácter Asistivo y Deber de Verificación:</strong> Las respuestas generadas por inteligencia artificial constituyen una ayuda orientativa de estudio y no reemplazan la bibliografía oficial de las cátedras universitarias ni el criterio del cuerpo docente. El estudiante asume la responsabilidad exclusiva de contrastar y validar cualquier información antes de rendir exámenes o presentar trabajos prácticos.
                </div>
              </div>
            </section>

            {/* Cláusula 3 */}
            <section id="cuentas-seguridad" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 3</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">3. Cuentas de Usuario y Confidencialidad</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
                <p>
                  Para acceder a las funcionalidades personalizadas, el usuario debe registrarse proporcionando información veraz. Cada cuenta es de uso estrictamente personal e intransferible.
                </p>
                <p>
                  El usuario es custodio único de la confidencialidad de su contraseña y de cualquier actividad originada bajo su sesión. TABE implementa estándares criptográficos modernos mediante Supabase Auth y Row Level Security (RLS) para resguardar la identidad del estudiante. Ante sospecha de acceso no autorizado, debe notificarse de inmediato a <code className="text-foreground">seguridad@tabe.com.ar</code>.
                </p>
              </div>
            </section>

            {/* Cláusula 4 */}
            <section id="propiedad-intelectual" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 4</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">4. Propiedad Intelectual y Apuntes Compartidos</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
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
            <section id="marketplace" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 5</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">5. Comunidad y Limitación de Responsabilidad de Terceros</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
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
            <section id="visores-externos" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Cláusula 6</span>
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                  6. Módulos de Navegación Externa, Visores Embebidos y Deslinde de Responsabilidad («Mi Campus» y Enlaces Externos)
                </h2>
              </div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
                <p>
                  <strong>a) Rol Instrumental Neutro y Mero Conducto:</strong> TABE pone a disposición visores web integrados y herramientas de acceso directo (como el apartado <strong>«Mi Campus»</strong> y enlaces personalizados) concebidas para que el estudiante centralice la consulta de portales universitarios, aulas virtuales (Moodle, Blackboard) u otras herramientas de productividad en una única interfaz. TABE actúa exclusivamente como un conducto técnico y facilitador de navegación, sin operar, controlar ni supervisar el contenido ni los servicios provistos en dichos sitios externos.
                </p>
                <p>
                  <strong>b) No Aprobación ni Respaldo de Sitios Incompatibles o Restringidos:</strong> TABE <strong>no aprueba, no respalda ni fomenta el uso de plataformas que rechacen la conexión, prohíban la visualización embebida o cuyas condiciones de servicio restrinjan el acceso mediante navegadores integrados o proxies de paso</strong> (tales como Discord, portales bancarios u otros servicios cerrados). Si una plataforma externa implementa restricciones técnicas o de licencia contra la incrustación, el usuario es el único responsable de acatar dichas políticas y debe acceder mediante las aplicaciones y canales oficiales provistos por el titular del servicio.
                </p>
                <p>
                  <strong>c) Responsabilidad Exclusiva del Usuario e Indemnidad Total:</strong> La carga de enlaces externos y toda actividad realizada dentro de sitios de terceros corre bajo la exclusiva cuenta y riesgo del usuario. TABE deslinda cualquier responsabilidad por violaciones a términos de servicio de terceros, infracciones a la propiedad intelectual o actividades ilícitas realizadas por los usuarios a través del visor, debiendo el usuario mantener indemne a TABE ante cualquier contingencia.
                </p>
                <p>
                  <strong>d) Reserva de Facultades de Bloqueo:</strong> TABE se reserva el derecho de inhabilitar cautelarmente cualquier URL o dominio en el visor ante sospecha fundada de fraude, malware, requerimiento judicial o solicitud de los titulares de dichos servicios.
                </p>
              </div>
            </section>

            {/* Cláusula 7 */}
            <section id="uso-aceptable" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 7</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">7. Reglas de Uso Aceptable y Prohibiciones</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
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

            {/* Cláusula 8 */}
            <section id="supresion-terminacion" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 8</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">8. Supresión de Cuenta y Derecho al Olvido</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
                <p>
                  De conformidad con la Ley 25.326 y normas internacionales de protección de datos, todo estudiante goza del derecho inalienable de eliminar su cuenta en cualquier momento.
                </p>
                <p>
                  El procedimiento puede ejecutarse de manera autónoma desde la sección de <Link to="/configuracion" className="text-primary underline font-semibold">Configuración</Link> utilizando la función "Eliminar mi cuenta y todos mis datos", la cual ejecuta una purga integral en cascada de registros, archivos en Storage y credenciales de autenticación.
                </p>
              </div>
            </section>

            {/* Cláusula 9 */}
            <section id="ley-jurisdiccion" className="scroll-mt-24 py-10 first:pt-0 border-t border-border/60 first:border-t-0 space-y-4">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Cláusula 9</span><h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">9. Legislación Aplicable y Jurisdicción</h2></div>
              <div className="space-y-3 text-sm font-normal text-muted-foreground leading-relaxed">
                <p>
                  Estos Términos y Condiciones se rigen e interpretan bajo las leyes de la República Argentina. Cualquier controversia derivada del uso de la plataforma será sometida a los tribunales ordinarios competentes de la Ciudad de Buenos Aires, con renuncia expresa a cualquier otro fuero o jurisdicción.
                </p>
                <div className="pt-4 border-t border-border/60 text-center text-xs font-semibold  text-muted-foreground">
                  © {currentYear} TABE Software • Todos los derechos reservados.
                </div>
              </div>
            </section>
          
    </LegalLayout>
  );
}
