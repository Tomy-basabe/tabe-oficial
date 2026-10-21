import { useState } from "react";
import { GraduationCap, School, Send, AlertCircle, Search, Check, ArrowLeft, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Careers extracted from the data templates
const AVAILABLE_CAREERS = [
  { id: "sistemas", name: "Ingeniería en Sistemas", university: "UTN FRM" },
  { id: "civil", name: "Ingeniería Civil", university: "UTN FRM / UNSJ" },
  { id: "quimica", name: "Ingeniería Química", university: "UTN FRM" },
  { id: "telecomunicaciones", name: "Ingeniería en Telecomunicaciones", university: "UTN FRM" },
  { id: "electromecanica_unsj", name: "Ingeniería Electromecánica", university: "UNSJ" },
  { id: "energia_electrica_unsj", name: "Ingeniería en Energía Eléctrica", university: "UNSJ" },
  { id: "mecanica_unsj", name: "Ingeniería Mecánica", university: "UNSJ" },
  { id: "mecanica_utn_frc", name: "Ingeniería Mecánica", university: "UTN FRC" },
  { id: "agronomia_uncuyo", name: "Ingeniería en Agronomía", university: "UNCUYO" },
  { id: "contactologia", name: "Tecnicatura en Contactología", university: "UNLP" },
  { id: "gestion_politicas_publicas_fcpys", name: "Tec. en Gestión de Políticas Públicas", university: "UNCUYO FCPyS" },
  { id: "trabajo_social_fcpys", name: "Licenciatura en Trabajo Social", university: "UNCUYO FCPyS" },
  { id: "sociologia_fcpys", name: "Licenciatura en Sociología", university: "UNCUYO FCPyS" },
  { id: "ciencia_politica_fcpys", name: "Lic. en Ciencia Política y Adm. Pública", university: "UNCUYO FCPyS" },
  { id: "comunicacion_social_fcpys", name: "Licenciatura en Comunicación Social", university: "UNCUYO FCPyS" },
  { id: "tupa_fcpys", name: "Tec. en Producción Audiovisual (TUPA)", university: "UNCUYO FCPyS" },
];

interface CareerSelectModalProps {
  open: boolean;
  onClose: () => void;
  onCareerSelected: (carrera: string, facultad: string) => void;
  onRequestCareer: (universidad: string, carrera: string) => Promise<{ error: string | null }>;
}

export function CareerSelectModal({ open, onClose, onCareerSelected, onRequestCareer }: CareerSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCareer, setSelectedCareer] = useState<typeof AVAILABLE_CAREERS[0] | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestUni, setRequestUni] = useState("");
  const [requestCarrera, setRequestCarrera] = useState("");
  const [sending, setSending] = useState(false);

  const filtered = AVAILABLE_CAREERS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.university.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    if (!selectedCareer) return;
    onCareerSelected(selectedCareer.name, selectedCareer.university);
    toast.success("Carrera actualizada correctamente");
    setSelectedCareer(null);
    setSearchQuery("");
  };

  const handleSubmitRequest = async () => {
    if (!requestUni.trim() || !requestCarrera.trim()) {
      toast.error("Por favor completa ambos campos");
      return;
    }
    setSending(true);
    const result = await onRequestCareer(requestUni.trim(), requestCarrera.trim());
    setSending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Solicitud enviada. Te avisaremos cuando esté disponible.");
      setShowRequestForm(false);
      setRequestUni("");
      setRequestCarrera("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card text-foreground border border-border/80 shadow-2xl max-w-lg max-h-[85vh] p-6 rounded-2xl overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span>{showRequestForm ? "Solicitar nueva carrera" : "Selecciona tu carrera"}</span>
          </DialogTitle>
        </DialogHeader>

        {!showRequestForm ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Elige tu carrera y facultad para que el emparejamiento te asigne preguntas y desafíos relevantes.
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar carrera o facultad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-muted/40 border-border/70 focus-visible:ring-1"
              />
            </div>

            {/* Career List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[38vh] pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No se encontraron carreras</p>
                  <p className="text-xs text-muted-foreground mt-1">¿No encuentras la tuya? Puedes solicitar que la agreguemos.</p>
                </div>
              ) : (
                filtered.map(career => {
                  const isSelected = selectedCareer?.id === career.id;
                  return (
                    <button
                      key={career.id}
                      type="button"
                      onClick={() => setSelectedCareer(career)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all text-sm flex items-center justify-between group",
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border/60 bg-card/60 hover:bg-muted/60 hover:border-border text-foreground"
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-sm truncate text-foreground group-hover:text-primary transition-colors">
                          {career.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <School className="w-3 h-3 text-muted-foreground/70" />
                          <span className="truncate">{career.university}</span>
                        </p>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 bg-background"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-3 border-t border-border/60">
              <Button
                className="w-full h-10 text-sm font-medium"
                disabled={!selectedCareer}
                onClick={handleConfirm}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Confirmar selección
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                onClick={() => setShowRequestForm(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                ¿No encuentras tu carrera? Solicitar agregarla
              </Button>
            </div>
          </div>
        ) : (
          /* Request Form */
          <div className="space-y-4 pt-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ingresa los datos de tu universidad y carrera para que el equipo de contenido agregue los mazos y temarios correspondientes.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Universidad / Facultad
                </label>
                <Input
                  placeholder="Ej: UTN FRM, UNCUYO, UBA..."
                  value={requestUni}
                  onChange={(e) => setRequestUni(e.target.value)}
                  className="h-10 text-sm bg-muted/40 border-border/70"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Nombre de la carrera
                </label>
                <Input
                  placeholder="Ej: Licenciatura en Ciencias de la Computación"
                  value={requestCarrera}
                  onChange={(e) => setRequestCarrera(e.target.value)}
                  className="h-10 text-sm bg-muted/40 border-border/70"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                className="flex-1 h-10 text-xs font-medium border-border/80"
                onClick={() => setShowRequestForm(false)}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Volver
              </Button>
              <Button
                className="flex-1 h-10 text-xs font-medium"
                disabled={sending || !requestUni.trim() || !requestCarrera.trim()}
                onClick={handleSubmitRequest}
              >
                {sending ? "Enviando..." : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Enviar solicitud
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
