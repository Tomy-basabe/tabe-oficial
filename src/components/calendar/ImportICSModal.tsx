import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, FileUp, Check, Calendar, Loader2 } from "lucide-react";
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
          tipo_examen: "Estudio" as EventType,
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
      <DialogContent className="sm:max-w-lg w-[95vw] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-6 space-y-4">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <span>Importar archivo .ics</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Sube un archivo .ics exportado de Google Calendar u otra app.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 pt-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                dragActive
                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/70 dark:bg-zinc-800/50"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40"
              )}
            >
              <FileUp className="w-9 h-9 mx-auto mb-2 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                Arrastra tu archivo .ics aquí
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">o haz clic para buscar en tu dispositivo</p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl space-y-1.5 text-left">
              <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>¿Cómo exportar desde Google Calendar?</span>
              </h4>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pl-1">
                <li>Abre Google Calendar en tu navegador</li>
                <li>Ve a Configuración → Importar y exportar</li>
                <li>Haz clic en "Exportar" y descomprime el archivo descargado</li>
                <li>Selecciona el archivo .ics aquí</li>
              </ol>
            </div>
          </div>
        )}

        {step === "select" && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {selectedEvents.size} de {parsedEvents.length} seleccionados
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  Seleccionar todos
                </button>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[300px] pr-1">
              {parsedEvents.map((event) => {
                const isChecked = selectedEvents.has(event.uid);
                return (
                  <button
                    key={event.uid}
                    type="button"
                    onClick={() => toggleEvent(event.uid)}
                    className={cn(
                      "w-full p-2.5 rounded-lg border text-left transition-colors flex items-start gap-2.5",
                      isChecked
                        ? "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700"
                        : "bg-white dark:bg-zinc-900/40 border-zinc-200/70 dark:border-zinc-800/70 opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                      isChecked
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                        : "border-zinc-300 dark:border-zinc-700 bg-transparent"
                    )}>
                      {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{event.title}</p>
                      <p className="text-[11px] text-zinc-400">
                        {new Date(event.date + "T12:00:00").toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {event.time && ` a las ${event.time}`}
                      </p>
                      {event.location && (
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          📍 {event.location}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="flex-1 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedEvents.size === 0}
                className="flex-1 h-9 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
              >
                Importar {selectedEvents.size} eventos
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-7 h-7 text-zinc-500 animate-spin" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Importando eventos...</p>
            <p className="text-xs text-zinc-400">Por favor espera mientras se guardan en tu calendario.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
