import { useState } from "react";
import { GraduationCap, School, Send, AlertCircle, Search, ChevronDown } from "lucide-react";
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
    toast.success("¡Carrera configurada!");
    setSelectedCareer(null);
    setSearchQuery("");
  };

  const handleSubmitRequest = async () => {
    if (!requestUni.trim() || !requestCarrera.trim()) {
      toast.error("Completá ambos campos");
      return;
    }
    setSending(true);
    const result = await onRequestCareer(requestUni.trim(), requestCarrera.trim());
    setSending(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("¡Solicitud enviada! Te notificaremos cuando se agregue tu carrera.");
      setShowRequestForm(false);
      setRequestUni("");
      setRequestCarrera("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {showRequestForm ? "Solicitar carrera nueva" : "¿Qué estudiás?"}
          </DialogTitle>
        </DialogHeader>

        {!showRequestForm ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <p className="text-sm text-muted-foreground">
              Para emparejarte con rivales de tu carrera, necesitamos saber qué estudiás.
              Esto no modifica tu plan de estudio.
            </p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar carrera o universidad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Career List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh] pr-1">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron resultados</p>
                </div>
              ) : (
                filtered.map(career => (
                  <button
                    key={career.id}
                    onClick={() => setSelectedCareer(career)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all duration-200",
                      selectedCareer?.id === career.id
                        ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{career.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <School className="w-3 h-3" />
                          {career.university}
                        </p>
                      </div>
                      {selectedCareer?.id === career.id && (
                        <div className="w-5 h-5 rounded-full bg-neon-cyan flex items-center justify-center">
                          <ChevronDown className="w-3 h-3 text-background rotate-0" />
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Button
                className="w-full bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 transition-opacity"
                disabled={!selectedCareer}
                onClick={handleConfirm}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                Confirmar carrera
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setShowRequestForm(true)}
              >
                ¿No encontrás tu carrera? <span className="ml-1 text-neon-cyan">Solicitala</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Request Form */
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Contanos qué estudias y te avisaremos cuando agreguemos tu carrera.
              La solicitud le llegará al equipo de TABE.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Universidad</label>
                <Input
                  placeholder="Ej: UTN FRM, UNCUYO, UBA..."
                  value={requestUni}
                  onChange={(e) => setRequestUni(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Carrera</label>
                <Input
                  placeholder="Ej: Ingeniería en Sistemas de Información"
                  value={requestCarrera}
                  onChange={(e) => setRequestCarrera(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRequestForm(false)}
              >
                Volver
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-neon-cyan to-neon-purple"
                disabled={sending || !requestUni.trim() || !requestCarrera.trim()}
                onClick={handleSubmitRequest}
              >
                {sending ? "Enviando..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
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
