import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  ChevronRight,
  Building2,
  Clock,
  Award,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { usePageTitle } from "@/hooks/useDynamicTitle";
import { AVAILABLE_CAREERS, ALL_FACULTADES } from "@/lib/careerData";
import { useAuth } from "@/contexts/AuthContext";
import careerStatsRaw from "@/lib/careerStats.json";

const careerStats = careerStatsRaw as Record<string, [number, number]>;

export default function CareerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Buscar en el registro oficial de carreras
  const careerInfo = AVAILABLE_CAREERS.find(
    (c) => c.id === id || c.file === id || c.file?.replace("carreras_mza/", "") === id
  );

  const name =
    careerInfo?.label ||
    id?.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") ||
    "Carrera Universitaria";

  // Facultad
  const facultyObj = ALL_FACULTADES.find((f) => f.id === careerInfo?.facultad);
  const facultyName = facultyObj?.fullLabel || facultyObj?.label || careerInfo?.facultad || "Universidad";
  const facultyId = careerInfo?.facultad || id || "";

  // Duración estimada/oficial
  const fileKey = (careerInfo?.file || id || "").split("/").pop()?.replace("_template", "") || "";
  const [, maxYear] = careerStats[fileKey] || [36, 5];
  const finalYears = maxYear || 5;
  const durationLabel = `${finalYears} ${finalYears === 1 ? "año" : "años"}`;

  const degreeType = name.toLowerCase().includes("tecnicatura")
    ? "Tecnicatura Universitaria"
    : name.toLowerCase().includes("profesorado")
    ? "Profesorado Universitario"
    : "Título de Grado";

  usePageTitle(!careerInfo && !id ? "Carrera no encontrada" : `${name} - ${facultyName}`);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/carreras")}
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group px-3 py-1.5 h-auto rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium">Volver a Carreras</span>
          </Button>
          <div className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">TABE</div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 flex-1 max-w-3xl flex flex-col items-center justify-center text-center">
        {/* Tarjeta Centralizada de la Carrera y Facultad */}
        <div className="w-full bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          {/* Logo oficial de la Facultad */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm mx-auto">
            <UniversityLogo universityId={facultyId} className="w-full h-full" />
          </div>

          {/* Nombre de la Facultad */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>{facultyName}</span>
          </div>

          {/* Nombre de la Carrera */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
            {name}
          </h1>

          {/* Metadatos Clave: Solo Facultad, Carrera y Duración */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 font-medium">Duración estimada</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{durationLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 font-medium">Nivel de Titulación</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{degreeType}</p>
              </div>
            </div>
          </div>

          {/* Call to action */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/carrera" : "/registro")}
              className="w-full sm:w-auto text-xs sm:text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl px-6 py-2.5 h-auto cursor-pointer shadow-sm"
            >
              {user ? "Gestionar en mi espacio" : "Registrarme en esta carrera"}{" "}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/carreras")}
              className="w-full sm:w-auto text-xs sm:text-sm font-medium border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl px-5 py-2.5 h-auto cursor-pointer"
            >
              Explorar otras carreras
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
