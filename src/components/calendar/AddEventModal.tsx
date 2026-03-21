import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, BookOpen, ExternalLink, MapPin, Palette } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EventType, CreateEventData, RecurrenceRule, CalendarEvent } from "@/hooks/useCalendarEvents";
import { Subject } from "@/hooks/useSubjects";
import { generateGoogleCalendarUrl } from "@/lib/googleCalendarUrl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventData | (Partial<CreateEventData> & { id: string })) => Promise<void>;
  subjects: Subject[];
  initialDate?: Date;
  editEvent?: CalendarEvent | null; // If provided, we are in Edit Mode
}

const baseEventTypes: { value: string; label: string; color: string; hex: string }[] = [
  { value: "P1", label: "Parcial 1", color: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan", hex: "#00d9ff" },
  { value: "P2", label: "Parcial 2", color: "bg-neon-purple/20 text-neon-purple border-neon-purple", hex: "#a855f7" },
  { value: "Global", label: "Global", color: "bg-neon-gold/20 text-neon-gold border-neon-gold", hex: "#fbbf24" },
  { value: "Recuperatorio P1", label: "Recup. P1", color: "bg-red-500/20 text-red-400 border-red-500", hex: "#ef4444" },
  { value: "Recuperatorio P2", label: "Recup. P2", color: "bg-red-500/20 text-red-400 border-red-500", hex: "#ef4444" },
  { value: "Recuperatorio Global", label: "Recup. Global", color: "bg-red-500/20 text-red-400 border-red-500", hex: "#ef4444" },
  { value: "Final", label: "Final", color: "bg-neon-green/20 text-neon-green border-neon-green", hex: "#22c55e" },
  { value: "TP", label: "TP", color: "bg-orange-500/20 text-orange-400 border-orange-500", hex: "#f97316" },
  { value: "Entrega", label: "Entrega", color: "bg-pink-500/20 text-pink-400 border-pink-500", hex: "#ec4899" },
  { value: "Clase", label: "Clase", color: "bg-blue-500/20 text-blue-400 border-blue-500", hex: "#3b82f6" },
  { value: "Estudio", label: "Estudio", color: "bg-muted text-muted-foreground border-muted-foreground", hex: "#6b7280" },
  { value: "Otro", label: "Otro", color: "bg-gray-500/20 text-gray-400 border-gray-500", hex: "#9ca3af" },
  { value: "Parcial +", label: "Parcial +", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500", hex: "#6366f1" },
];

const PRESET_COLORS = [
  "#00d9ff", "#a855f7", "#fbbf24", "#ef4444", "#22c55e",
  "#ec4899", "#3b82f6", "#f97316", "#14b8a6", "#6366f1"
];

export function AddEventModal({ open, onClose, onSubmit, subjects, initialDate, editEvent }: AddEventModalProps) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState<Date | undefined>(new Date());
  const [hora, setHora] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [tipoExamen, setTipoExamen] = useState<string>("P1");
  const [customParcialNum, setCustomParcialNum] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [ubicacion, setUbicacion] = useState("");
  const [notas, setNotas] = useState("");
  const [customColor, setCustomColor] = useState<string | null>(null);

  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(null);
  const [recurrenceEnd, setRecurrenceEnd] = useState("");

  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [showGoogleButton, setShowGoogleButton] = useState(false);
  const [savedEventData, setSavedEventData] = useState<{
    titulo: string;
    fecha: string;
    hora?: string;
    notas?: string;
  } | null>(null);

  const eventTypes = useMemo(() => {
    // Si estamos editando y el tipo de examen es un Parcial custom (ej. "P3"), lo agregamos a las opciones para que se seleccione visualmente
    if (editEvent && !baseEventTypes.some(t => t.value === editEvent.tipo_examen)) {
      return [...baseEventTypes.filter(t => t.value !== "Parcial +"), { 
        value: editEvent.tipo_examen, 
        label: editEvent.tipo_examen, 
        color: "bg-indigo-500/20 text-indigo-400 border-indigo-500", 
        hex: "#6366f1" 
      }, { value: "Parcial +", label: "Parcial +", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500", hex: "#6366f1" }];
    }
    return baseEventTypes;
  }, [editEvent]);

  // Initialize form when modal opens (Create or Edit mode)
  useEffect(() => {
    if (!open) return;

    if (editEvent) {
      setTitulo(editEvent.titulo);
      setFecha(new Date(editEvent.fecha + "T12:00:00"));
      setHora(editEvent.hora || "");
      setHoraFin(editEvent.hora_fin || "");
      setIsAllDay(editEvent.is_all_day || (!editEvent.hora));
      setTipoExamen(editEvent.tipo_examen);
      setSubjectId(editEvent.subject_id || "");
      setUbicacion(editEvent.ubicacion || "");
      setNotas(editEvent.notas || "");
      
      if (editEvent.tipo_examen.startsWith("P") && !["P1", "P2"].includes(editEvent.tipo_examen)) {
        setCustomParcialNum(editEvent.tipo_examen.replace("P", ""));
      }

      // Attempt to find if current color is default for type
      const defaultHex = baseEventTypes.find(t => t.value === editEvent.tipo_examen)?.hex || "#6366f1";
      if (editEvent.color && editEvent.color !== defaultHex) {
        setCustomColor(editEvent.color);
      } else {
        setCustomColor(null);
      }

      setRecurrenceRule(editEvent.recurrence_rule);
      setRecurrenceEnd(editEvent.recurrence_end || "");
      setShowGoogleButton(false);
    } else {
      // Create mode
      setTitulo("");
      setFecha(initialDate || new Date());
      setHora("");
      setHoraFin("");
      setIsAllDay(false);
      setTipoExamen("P1");
      setCustomParcialNum("");
      setSubjectId("");
      setUbicacion("");
      setNotas("");
      setCustomColor(null);
      setRecurrenceRule(null);
      setRecurrenceEnd("");
      setShowGoogleButton(false);
      setSavedEventData(null);
    }
  }, [open, initialDate, editEvent]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;
    
    // Convert "Parcial +" state to dynamic type before saving
    let finalTipoExamen = tipoExamen;
    if (tipoExamen === "Parcial +") {
      finalTipoExamen = customParcialNum ? `P${customParcialNum}` : "Parcial Extra";
    }

    setLoading(true);
    try {
      const dbColor = customColor || eventTypes.find(t => t.value === tipoExamen)?.hex || "#6366f1";

      const eventData = {
        titulo: titulo.trim(),
        fecha: fecha.toISOString().split('T')[0],
        hora: isAllDay ? undefined : (hora || undefined),
        hora_fin: isAllDay ? undefined : (horaFin || undefined),
        is_all_day: isAllDay,
        tipo_examen: finalTipoExamen,
        subject_id: subjectId || undefined,
        ubicacion: ubicacion || undefined,
        notas: notas || undefined,
        color: dbColor,
        recurrence_rule: recurrenceRule,
        recurrence_end: recurrenceEnd || undefined,
      };

      if (editEvent) {
        await onSubmit({ ...eventData, id: editEvent.id });
        handleClose();
      } else {
        await onSubmit(eventData as CreateEventData);
        // Only show Google export on creation to avoid complex update logic here
        setSavedEventData({
          titulo: eventData.titulo,
          fecha: eventData.fecha,
          hora: eventData.hora,
          notas: eventData.notas,
        });
        setShowGoogleButton(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!savedEventData) return;
    const url = generateGoogleCalendarUrl({
      title: savedEventData.titulo,
      date: savedEventData.fecha,
      time: savedEventData.hora,
      description: savedEventData.notas,
    });
    window.open(url, "_blank");
    toast.success("Abriendo Google Calendar...");
    handleClose();
  };

  const generateTitle = (type: string, subId: string, customNum?: string) => {
    const subject = subjects.find(s => s.id === subId);
    if (!subject) return "";
    let typeLabel = baseEventTypes.find(t => t.value === type)?.label || type;
    if (type === "Parcial +") {
      typeLabel = customNum ? `Parcial ${customNum}` : "Parcial";
    }
    return `${typeLabel} - ${subject.nombre}`;
  };

  const handleTypeChange = (type: string) => {
    setTipoExamen(type);
    if (subjectId && type !== "Estudio" && !editEvent) {
      setTitulo(generateTitle(type, subjectId, customParcialNum));
    }
  };

  const handleCustomNumChange = (num: string) => {
    setCustomParcialNum(num);
    if (subjectId && !editEvent) {
      setTitulo(generateTitle("Parcial +", subjectId, num));
    }
  };

  const handleSubjectChange = (subId: string) => {
    setSubjectId(subId);
    if (subId && tipoExamen !== "Estudio" && !editEvent) {
      setTitulo(generateTitle(tipoExamen, subId, customParcialNum));
    }
  };

  const subjectsByYear = [...new Set(subjects.map(s => s.año))]
    .sort((a, b) => a - b)
    .map(year => ({
      year,
      subjects: subjects.filter(s => s.año === year),
    }));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl gradient-text flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {showGoogleButton ? "¡Evento Creado!" : editEvent ? "Editar Evento" : "Nuevo Evento"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Administra los detalles de este evento
          </DialogDescription>
        </DialogHeader>

        {showGoogleButton ? (
          <div className="space-y-4 py-4 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-neon-green/20 flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 text-neon-green" />
              </div>
              <h3 className="font-medium text-lg">{savedEventData?.titulo}</h3>
              <p className="text-sm text-muted-foreground">
                El evento fue guardado en tu calendario
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleAddToGoogleCalendar}
                className="w-full py-3 rounded-xl font-medium bg-[#4285F4] text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <ExternalLink className="w-4 h-4" />
                Agregar a Google Calendar
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de evento</label>
              <div className="grid grid-cols-4 gap-1.5">
                {eventTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                      tipoExamen === type.value
                        ? type.color
                        : "bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
              {tipoExamen === "Parcial +" && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="number"
                    min="3"
                    value={customParcialNum}
                    onChange={(e) => handleCustomNumChange(e.target.value)}
                    placeholder="Número de parcial (ej: 3)"
                    className="w-full px-4 py-2 bg-background rounded-lg border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Escribe manualmente el número del parcial. Por ejemplo, "3" o "4".</p>
                </div>
              )}
            </div>

            {/* Subject Selection */}
            {tipoExamen !== "Estudio" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Materia
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                >
                  <option value="">Seleccionar materia...</option>
                  {subjectsByYear.map(({ year, subjects: yearSubjects }) => (
                    <optgroup key={year} label={`Año ${year}`}>
                      {yearSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          #{subject.numero_materia} - {subject.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título del evento</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Parcial 1 - Análisis Matemático"
                className="w-full px-4 py-2.5 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Fecha
                </label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full px-4 py-2.5 bg-secondary rounded-xl border border-border text-left text-sm",
                        !fecha && "text-muted-foreground"
                      )}
                    >
                      {fecha ? format(fecha, "PPP", { locale: es }) : "Seleccionar"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(date) => {
                        setFecha(date);
                        setDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Hora
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Todo el día</span>
                    <Switch
                      checked={isAllDay}
                      onCheckedChange={setIsAllDay}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
                {!isAllDay && (
                  <div className="flex gap-2 mt-2">
                    <div className="w-full flex space-x-2 items-center">
                      <label className="text-xs text-muted-foreground w-10">Inicio</label>
                      <input
                        type="time"
                        value={hora}
                        onChange={(e) => setHora(e.target.value)}
                        required={tipoExamen === "Clase"}
                        className="flex-1 px-4 py-2.5 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <div className="w-full flex space-x-2 items-center">
                      <label className="text-xs text-muted-foreground w-6">Fin</label>
                      <input
                        type="time"
                        value={horaFin}
                        onChange={(e) => setHoraFin(e.target.value)}
                        required={tipoExamen === "Clase"}
                        className="flex-1 px-4 py-2.5 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div className="p-3 bg-secondary/30 rounded-xl border border-border/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Repetir</label>
                  <select
                    value={recurrenceRule || ""}
                    onChange={(e) => setRecurrenceRule((e.target.value || null) as RecurrenceRule)}
                    className="w-2/3 px-3 py-1.5 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  >
                    <option value="">No se repite</option>
                    <option value="DAILY">Diariamente</option>
                    <option value="WEEKLY">Semanalmente</option>
                    <option value="MONTHLY">Mensualmente</option>
                    <option value="YEARLY">Anualmente</option>
                  </select>
                </div>

                {recurrenceRule && (
                  <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                    <label className="text-sm font-medium">Hasta</label>
                    <input
                      type="date"
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                      className="w-2/3 px-3 py-1.5 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Ubicación
              </label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Añadir lugar..."
                className="w-full px-4 py-2.5 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Color Customization */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color del evento
              </label>
              <div className="flex items-center gap-2 flex-wrap pb-1">
                <button
                  type="button"
                  onClick={() => setCustomColor(null)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform",
                    customColor === null ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: eventTypes.find(t => t.value === tipoExamen)?.hex || "#6366f1" }}
                  title="Color predeterminado del tipo"
                />
                <div className="w-px h-6 bg-border mx-1" />
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCustomColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      customColor === color ? "border-foreground scale-110 shadow-sm" : "border-transparent opacity-80 hover:opacity-100 hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Añadir descripción..."
                rows={2}
                className="w-full px-4 py-2.5 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !titulo.trim() || !fecha || (tipoExamen === "Parcial +" && !customParcialNum)}
                className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? "Guardando..." : editEvent ? "Guardar cambios" : "Crear Evento"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
