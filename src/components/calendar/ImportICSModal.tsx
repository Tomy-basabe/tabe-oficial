import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileUp, Check, AlertCircle, Calendar } from "lucide-react";
import { parseICSFile, validateICSFile, ICSEvent } from "@/lib/icsParser";
import { cn } from "@/lib/utils";
import { EventType, CreateEventData } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";

interface ImportICSModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (events: CreateEventData[]) => Promise<void>;
}

export function ImportICSModal({ open, onClose, onImport }: ImportICSModalProps) {
  const [parsedEvents, setParsedEvents] = useState<ICSEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"upload" | "select" | "importing">("upload");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setParsedEvents([]);
    setSelectedEvents(new Set());
    setStep("upload");
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".ics")) {
      toast.error("Por favor selecciona un archivo .ics");
      return;
    }

    try {
      const content = await file.text();
      
      if (!validateICSFile(content)) {
        toast.error("El archivo no es un calendario válido");
        return;
      }

      const events = parseICSFile(content);
      
      if (events.length === 0) {
        toast.error("No se encontraron eventos en el archivo");
        return;
      }

      setParsedEvents(events);
      setSelectedEvents(new Set(events.map(e => e.uid)));
      setStep("select");
      toast.success(`Se encontraron ${events.length} eventos`);
    } catch (error) {
      console.error("Error parsing ICS:", error);
      toast.error("Error al leer el archivo");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleEvent = (uid: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedEvents(newSelected);
  };

  const selectAll = () => {
    setSelectedEvents(new Set(parsedEvents.map(e => e.uid)));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  const handleImport = async () => {
    if (selectedEvents.size === 0) {
      toast.error("Selecciona al menos un evento");
      return;
    }

    setStep("importing");

    try {
      const eventsToImport: CreateEventData[] = parsedEvents
        .filter(e => selectedEvents.has(e.uid))
        .map(e => ({
          titulo: e.title,
          fecha: e.date,
          hora: e.time,
          tipo_examen: "Estudio" as EventType, // Default to study session
          notas: e.description || e.location ? 
            [e.description, e.location ? `📍 ${e.location}` : ""].filter(Boolean).join("\n") : 
            undefined,
        }));

      await onImport(eventsToImport);
      toast.success(`${eventsToImport.length} eventos importados correctamente`);
      handleClose();
    } catch (error) {
      console.error("Error importing events:", error);
      toast.error("Error al importar los eventos");
      setStep("select");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-background border-4 border-foreground shadow-[12px_12px_0_0_hsl(var(--foreground))] rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-2xl uppercase tracking-widest flex items-center gap-2 text-foreground">
            <Upload className="w-6 h-6 text-foreground" />
            Importar desde Google Calendar
          </DialogTitle>
          <DialogDescription className="font-bold">
            Sube un archivo .ics exportado desde Google Calendar
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-[3px] border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                dragActive ? "border-[#00F0FF] bg-[#00F0FF]/10 shadow-[4px_4px_0_0_#000]" : "border-foreground hover:border-[#00F0FF] hover:bg-[#00F0FF]/5 hover:shadow-[4px_4px_0_0_#000]"
              )}
            >
              <FileUp className="w-12 h-12 mx-auto mb-4 text-foreground" />
              <p className="font-black uppercase tracking-widest mb-1">Arrastra tu archivo .ics aquí</p>
              <p className="text-sm font-bold text-muted-foreground">o haz clic para seleccionarlo</p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="bg-[#FFE66D] border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl p-5 text-sm mt-6">
              <h4 className="font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                ¿Cómo exportar desde Google Calendar?
              </h4>
              <ol className="list-decimal list-inside space-y-1 font-bold text-foreground/80 text-xs">
                <li>Abre Google Calendar en tu navegador</li>
                <li>Ve a Configuración → Importar y exportar</li>
                <li>Haz clic en "Exportar"</li>
                <li>Descomprime el archivo descargado</li>
                <li>Sube el archivo .ics aquí</li>
              </ol>
            </div>
          </div>
        )}

        {step === "select" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b-2 border-foreground pb-2">
              <p className="text-sm font-black uppercase tracking-widest">
                {selectedEvents.size} de {parsedEvents.length} seleccionados
              </p>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-bold text-[#00F0FF] hover:underline"
                >
                  Seleccionar todos
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs font-bold text-muted-foreground hover:underline"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-2">
              {parsedEvents.map((event) => (
                <button
                  key={event.uid}
                  onClick={() => toggleEvent(event.uid)}
                  className={cn(
                    "w-full p-3 rounded-lg border-[3px] border-foreground text-left transition-all hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000]",
                    selectedEvents.has(event.uid)
                      ? "bg-[#00FF9D] text-black shadow-[4px_4px_0_0_#000]"
                      : "bg-white text-black"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                      selectedEvents.has(event.uid) 
                        ? "border-black bg-black" 
                        : "border-black bg-white"
                    )}>
                      {selectedEvents.has(event.uid) && (
                        <Check className="w-4 h-4 text-[#00FF9D]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase tracking-tight text-sm truncate">{event.title}</p>
                      <p className="text-xs font-bold opacity-80">
                        {new Date(event.date + "T12:00:00").toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {event.time && ` a las ${event.time}`}
                      </p>
                      {event.location && (
                        <p className="text-xs font-bold opacity-80 truncate mt-0.5">
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t-2 border-foreground">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 py-3 bg-muted text-foreground border-[3px] border-foreground rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
              >
                Atrás
              </button>
              <button
                onClick={handleImport}
                disabled={selectedEvents.size === 0}
                className="flex-1 py-3 bg-[#00FF9D] text-black border-[3px] border-foreground rounded-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[4px_4px_0_0_#000]"
              >
                Importar {selectedEvents.size}
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 mx-auto rounded-xl bg-[#00F0FF] border-4 border-foreground shadow-[4px_4px_0_0_#000] flex items-center justify-center animate-pulse mb-6">
              <Upload className="w-8 h-8 text-black" />
            </div>
            <p className="font-black text-xl uppercase tracking-widest text-foreground">Importando eventos...</p>
            <p className="text-sm font-bold text-muted-foreground mt-2">
              Por favor espera mientras se crean los eventos
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
