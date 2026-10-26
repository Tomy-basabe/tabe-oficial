import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, Info, FileUp, Check, Clock, Search, X } from "lucide-react";
import { ALL_PROVINCIAS, ALL_FACULTADES, AVAILABLE_FACULTADES, AVAILABLE_CAREERS, AVAILABLE_PROVINCIAS } from "@/lib/careerData";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { cn } from "@/lib/utils";
import careerStatsRaw from "@/lib/careerStats.json";

const careerStats = careerStatsRaw as Record<string, [number, number]>;

interface ImportCareerModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (careerId: string) => Promise<void>;
  onOpenAiImport?: () => void;
}

export const ImportCareerModal = ({ open, onClose, onImport, onOpenAiImport }: ImportCareerModalProps) => {
  const [selectedProvincia, setSelectedProvincia] = useState<string>("ALL");
  const [selectedFacultad, setSelectedFacultad] = useState<string>("UTN");
  const [selectedCareer, setSelectedCareer] = useState<string>("sistemas");
  const [loading, setLoading] = useState(false);

  // Estados de búsqueda
  const [searchFacultad, setSearchFacultad] = useState("");
  const [searchCareer, setSearchCareer] = useState("");

  const filteredFacultades = useMemo(() => {
    const q = searchFacultad.trim().toLowerCase();
    return AVAILABLE_FACULTADES.filter((f) => {
      if (selectedProvincia !== "ALL" && f.provinciaId !== selectedProvincia) {
        return false;
      }
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.fullLabel.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    });
  }, [selectedProvincia, searchFacultad]);

  const careersInSelectedFacultad = useMemo(() => {
    return AVAILABLE_CAREERS.filter((c) => c.facultad === selectedFacultad);
  }, [selectedFacultad]);

  const filteredCareers = useMemo(() => {
    const q = searchCareer.trim().toLowerCase();
    if (!q) return careersInSelectedFacultad;
    return careersInSelectedFacultad.filter((c) => c.label.toLowerCase().includes(q));
  }, [careersInSelectedFacultad, searchCareer]);

  const handleImport = async () => {
    if (!selectedCareer) return;
    setLoading(true);
    try {
      await onImport(selectedCareer);
      onClose();
    } catch (error) {
      console.error("Error in modal import:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && !v && onClose()}>
      <DialogContent 
        className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-xl w-full max-w-4xl w-[94vw] h-[85vh] max-h-[760px] flex flex-col p-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <BookOpen className="h-4 w-4 text-zinc-500" />
                Importar plan de estudios oficial
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Buscá y seleccioná tu facultad y carrera para cargar las materias y correlatividades precargadas.
              </p>
            </div>
          </div>

          {onOpenAiImport && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0">
                  <FileUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                    ¿Tenés tu plan en PDF, Excel o foto?
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Importá y extraé automáticamente todas las materias y correlatividades desde tu archivo con IA.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAiImport();
                }}
                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium px-3 py-1.5 h-auto rounded-lg shadow-2xs shrink-0 transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5 mr-1.5" />
                Subir con IA
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Body: Split View con Buscadores */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-[#212121]">
          {/* Left: Lista de Facultades con buscador */}
          <div className="w-56 sm:w-64 shrink-0 border-r border-zinc-100 dark:border-zinc-800/80 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden p-2.5 space-y-2">
            {/* Selector de Provincia */}
            <div className="space-y-1 shrink-0">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Provincia
              </label>
              <Select
                value={selectedProvincia}
                onValueChange={(val) => {
                  setSelectedProvincia(val);
                  setSearchFacultad("");
                  const matchingFac = AVAILABLE_FACULTADES.find(
                    (f) => val === "ALL" || f.provinciaId === val
                  );
                  if (matchingFac) {
                    setSelectedFacultad(matchingFac.id);
                    const firstCarr = AVAILABLE_CAREERS.find((c) => c.facultad === matchingFac.id);
                    if (firstCarr) setSelectedCareer(firstCarr.id);
                  }
                }}
              >
                <SelectTrigger className="w-full h-8 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs rounded-lg">
                  <SelectValue placeholder="Provincia..." />
                </SelectTrigger>
                <SelectContent className="max-h-56 z-50">
                  <SelectItem value="ALL" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    🏛️ Todas las provincias
                  </SelectItem>
                  {AVAILABLE_PROVINCIAS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <Input
                placeholder="Buscar facultad..."
                value={searchFacultad}
                onChange={(e) => setSearchFacultad(e.target.value)}
                className="h-8 pl-7 pr-7 text-xs bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/80 rounded-lg"
              />
              {searchFacultad && (
                <button
                  type="button"
                  onClick={() => setSearchFacultad("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredFacultades.map((f) => {
                const count = AVAILABLE_CAREERS.filter((c) => c.facultad === f.id).length;
                const isSelected = selectedFacultad === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFacultad(f.id);
                      setSearchCareer("");
                      const first = AVAILABLE_CAREERS.find((c) => c.facultad === f.id);
                      if (first) setSelectedCareer(first.id);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between border gap-2 cursor-pointer",
                      isSelected
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium border-transparent shadow-2xs"
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                        <UniversityLogo universityId={f.id} className="w-4 h-4" />
                      </div>
                      <span className="truncate">{f.label}</span>
                    </div>
                    {count > 0 && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0",
                          isSelected ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900" : "text-zinc-400"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Lista de Carreras con buscador */}
          <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
              <div className="truncate">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                  {ALL_FACULTADES.find((f) => f.id === selectedFacultad)?.fullLabel}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {careersInSelectedFacultad.length} {careersInSelectedFacultad.length === 1 ? "carrera disponible" : "carreras disponibles"}
                </span>
              </div>

              {/* Buscador de Carreras */}
              {careersInSelectedFacultad.length > 3 && (
                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <Input
                    placeholder="Buscar carrera..."
                    value={searchCareer}
                    onChange={(e) => setSearchCareer(e.target.value)}
                    className="h-8 pl-7 text-xs bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-lg"
                  />
                  {searchCareer && (
                    <button
                      type="button"
                      onClick={() => setSearchCareer("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable Grid of Careers */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredCareers.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-zinc-500">
                  <p className="text-xs">No se encontraron carreras con ese nombre en esta facultad.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchCareer("")}
                    className="text-xs"
                  >
                    Ver todas las carreras
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredCareers.map((c) => {
                    const isSelected = selectedCareer === c.id;
                    const fileKey = (c.file || c.id).split("/").pop()?.replace("_template", "") || "";
                    const [, maxYear] = careerStats[fileKey] || [36, 5];
                    const finalYears = maxYear || 5;
                    const durationLabel = `${finalYears} ${finalYears === 1 ? "año" : "años"}`;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCareer(c.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors flex items-start justify-between gap-2.5 cursor-pointer",
                          isSelected
                            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/70 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1e1e1e] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-medium leading-snug text-zinc-900 dark:text-zinc-100 truncate">
                            {c.label}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              Duración: {durationLabel}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 text-center sm:text-left">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Se asignará la facultad a tu perfil y se cargarán sus materias con correlatividades.</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-medium px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 h-auto rounded-lg cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium px-4 py-2 h-auto rounded-lg shadow-2xs transition-colors cursor-pointer"
              onClick={handleImport}
              disabled={loading || !selectedCareer}
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</>
              ) : (
                <><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Importar carrera seleccionada</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
