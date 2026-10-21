import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, BookOpen, MapPin, Palette, Trash2, Repeat, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, toLocalDateStr } from "@/lib/utils";
import { CreateEventData, RecurrenceRule, CalendarEvent } from "@/hooks/useCalendarEvents";
import { Subject } from "@/hooks/useSubjects";
import { stripGoogleEventId } from "@/lib/googleCalendarSync";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/contexts/ConfirmModalContext";

interface AddEventModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventData | (Partial<CreateEventData> & { id: string })) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  subjects: Subject[];
  initialDate?: Date;
  editEvent?: CalendarEvent | null;
}

const baseEventTypes = [
  { value: "P1", label: "Parcial 1", dot: "bg-emerald-500", activeStyle: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", hex: "#10b981" },
  { value: "P2", label: "Parcial 2", dot: "bg-sky-500", activeStyle: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30", hex: "#0ea5e9" },
  { value: "Global", label: "Global", dot: "bg-amber-500", activeStyle: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30", hex: "#f59e0b" },
  { value: "Recuperatorio P1", label: "Recup. P1", dot: "bg-rose-500", activeStyle: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30", hex: "#f43f5e" },
  { value: "Recuperatorio P2", label: "Recup. P2", dot: "bg-rose-500", activeStyle: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30", hex: "#f43f5e" },
  { value: "Recuperatorio Global", label: "Recup. Global", dot: "bg-rose-500", activeStyle: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30", hex: "#f43f5e" },
  { value: "Final", label: "Final", dot: "bg-purple-500", activeStyle: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30", hex: "#a855f7" },
  { value: "TP", label: "TP", dot: "bg-orange-500", activeStyle: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30", hex: "#f97316" },
  { value: "Entrega", label: "Entrega", dot: "bg-pink-500", activeStyle: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30", hex: "#ec4899" },
  { value: "Clase", label: "Clase", dot: "bg-blue-500", activeStyle: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30", hex: "#3b82f6" },
  { value: "Estudio", label: "Estudio", dot: "bg-zinc-500", activeStyle: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30", hex: "#71717a" },
  { value: "Otro", label: "Otro", dot: "bg-slate-500", activeStyle: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30", hex: "#64748b" },
  { value: "Parcial +", label: "Parcial +", dot: "bg-indigo-500", activeStyle: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", hex: "#6366f1" },
];

const PRESET_COLORS = [
  "#00d9ff", "#a855f7", "#fbbf24", "#ef4444", "#22c55e",
  "#ec4899", "#3b82f6", "#f97316", "#14b8a6", "#6366f1"
];

export function AddEventModal({ open, onClose, onSubmit, onDelete, subjects, initialDate, editEvent }: AddEventModalProps) {
  const { confirm } = useConfirm();
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
  
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");

  const [loading, setLoading] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const eventTypes = useMemo(() => {
    if (editEvent && !baseEventTypes.some(t => t.value === editEvent.tipo_examen)) {
      return [
        ...baseEventTypes.filter(t => t.value !== "Parcial +"),
        { 
          value: editEvent.tipo_examen, 
          label: editEvent.tipo_examen, 
          dot: "bg-indigo-500",
          activeStyle: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", 
          hex: "#6366f1" 
        },
        { 
          value: "Parcial +", 
          label: "Parcial +", 
          dot: "bg-indigo-500",
          activeStyle: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", 
          hex: "#6366f1" 
        }
      ];
    }
    return baseEventTypes;
  }, [editEvent]);

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
      setNotas(stripGoogleEventId(editEvent.notas) || "");
      
      if (editEvent.tipo_examen.startsWith("P") && !["P1", "P2"].includes(editEvent.tipo_examen)) {
        setCustomParcialNum(editEvent.tipo_examen.replace("P", ""));
      }

      const defaultHex = baseEventTypes.find(t => t.value === editEvent.tipo_examen)?.hex || "#6366f1";
      if (editEvent.color && editEvent.color !== defaultHex) {
        setCustomColor(editEvent.color);
      } else {
        setCustomColor(null);
      }

      setRecurrenceRule(editEvent.recurrence_rule);
      setRecurrenceEnd(editEvent.recurrence_end || "");
    } else {
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
    }
  }, [open, initialDate, editEvent]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;
    
    let finalTipoExamen = tipoExamen;
    if (tipoExamen === "Parcial +") {
      finalTipoExamen = customParcialNum ? `P${customParcialNum}` : "Parcial Extra";
    }

    setLoading(true);
    try {
      const dbColor = customColor || eventTypes.find(t => t.value === tipoExamen)?.hex || "#6366f1";

      const eventData = {
        titulo: titulo.trim(),
        fecha: toLocalDateStr(fecha),
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
      } else {
        await onSubmit(eventData as CreateEventData);
      }
      handleClose();
    } finally {
      setLoading(false);
    }
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
      <DialogContent className="sm:max-w-[580px] w-[95vw] bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <span>{editEvent ? "Editar Evento" : "Nuevo Evento"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            Completa los detalles para agregarlo a tu calendario académico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo de evento */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Tipo de evento</label>
            <div className="flex flex-wrap gap-1.5">
              {eventTypes.map((type) => {
                const isSelected = tipoExamen === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5",
                      isSelected
                        ? type.activeStyle
                        : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", type.dot)} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            
            {tipoExamen === "Parcial +" && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                <input
                  type="number"
                  min="3"
                  value={customParcialNum}
                  onChange={(e) => handleCustomNumChange(e.target.value)}
                  placeholder="Número de parcial (ej: 3)"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-xs font-medium"
                  required
                />
                <p className="text-[11px] text-zinc-500 mt-1">Escribe el número del parcial. Por ejemplo: 3 o 4.</p>
              </div>
            )}
          </div>

          {/* Selección de Materia */}
          {tipoExamen !== "Estudio" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Materia</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Desplegable de Año */}
                <Select
                  value={selectedYearFilter}
                  onValueChange={(val) => {
                    setSelectedYearFilter(val);
                    setSubjectId(""); 
                  }}
                >
                  <SelectTrigger className="w-full h-9 px-3 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
                    <SelectItem value="all" className="text-xs font-medium">Todos los años</SelectItem>
                    {subjectsByYear.map(({ year }) => (
                      <SelectItem key={year} value={year.toString()} className="text-xs font-medium">
                        Año {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Desplegable de Materia */}
                <div className="sm:col-span-2">
                  <Select
                    value={subjectId}
                    onValueChange={handleSubjectChange}
                  >
                    <SelectTrigger className="w-full h-9 px-3 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium text-left truncate hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <SelectValue placeholder="Seleccionar materia..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[250px] shadow-lg">
                      {subjectsByYear
                        .filter(g => selectedYearFilter === "all" || g.year.toString() === selectedYearFilter)
                        .map(({ year, subjects: yearSubjects }) => (
                          <SelectGroup key={year}>
                            <SelectLabel className="font-semibold text-zinc-400 text-[10px] uppercase tracking-wider px-2 py-1">
                              Año {year}
                            </SelectLabel>
                            {yearSubjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id} className="text-xs font-medium">
                                #{subject.numero_materia} - {subject.nombre}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Título del evento</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Parcial 1 - Análisis Matemático"
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm font-normal"
              required
            />
          </div>

          {/* Fecha y Horario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Fecha</span>
              </label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-left flex items-center justify-between",
                      !fecha && "text-zinc-400"
                    )}
                  >
                    <span>{fecha ? format(fecha, "PPP", { locale: es }) : "Seleccionar"}</span>
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(d) => {
                      setFecha(d);
                      setDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Todo el día toggle & Horas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Horario</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-[11px] text-zinc-500">Todo el día</span>
                  <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                </label>
              </div>

              {!isAllDay ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full h-9 px-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                  <input
                    type="time"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    placeholder="Fin"
                    className="w-full h-9 px-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>
              ) : (
                <div className="h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-400 flex items-center">
                  Evento programado para todo el día
                </div>
              )}
            </div>
          </div>

          {/* Repetición / Recurrencia */}
          <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-zinc-400" />
                <span>Repetir</span>
              </label>
              <div className="w-48">
                <Select
                  value={recurrenceRule || "NONE"}
                  onValueChange={(val) => setRecurrenceRule(val === "NONE" ? null : (val as RecurrenceRule))}
                >
                  <SelectTrigger className="w-full h-8.5 px-3 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-2xs transition-colors">
                    <SelectValue placeholder="No se repite" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
                    <SelectItem value="NONE" className="text-xs font-medium">No se repite</SelectItem>
                    <SelectItem value="DAILY" className="text-xs font-medium">Diariamente</SelectItem>
                    <SelectItem value="WEEKLY" className="text-xs font-medium">Semanalmente</SelectItem>
                    <SelectItem value="MONTHLY" className="text-xs font-medium">Mensualmente</SelectItem>
                    <SelectItem value="YEARLY" className="text-xs font-medium">Anualmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {recurrenceRule && (
              <div className="flex items-center justify-between gap-3 pt-1 animate-in fade-in slide-in-from-top-1">
                <label className="text-xs font-medium text-zinc-500">Repetir hasta</label>
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(e) => setRecurrenceEnd(e.target.value)}
                  className="w-48 h-8 px-2.5 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>
            )}
          </div>

          {/* Ubicación */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ubicación</span>
            </label>
            <input
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Aula, enlace de Meet o sede..."
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-xs font-normal"
            />
          </div>

          {/* Color del evento */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span>Color de acento</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCustomColor(null)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-transform",
                  customColor === null ? "ring-2 ring-zinc-900 dark:ring-zinc-100 scale-110" : "border-transparent opacity-70 hover:opacity-100"
                )}
                style={{ backgroundColor: eventTypes.find(t => t.value === tipoExamen)?.hex || "#6366f1" }}
                title="Color por defecto"
              />
              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCustomColor(color)}
                  className={cn(
                    "w-5 h-5 rounded-full border transition-transform",
                    customColor === color ? "ring-2 ring-zinc-900 dark:ring-zinc-100 scale-110 shadow-2xs" : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Notas / Contenido</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Temas que entran, requisitos o apuntes..."
              rows={2}
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 rounded-lg border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-xs font-normal resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
            {editEvent && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "¿Eliminar evento?",
                    description: "¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer.",
                    confirmText: "Eliminar",
                    cancelText: "Cancelar",
                    variant: "danger",
                  });
                  if (ok) {
                    await onDelete(editEvent.id);
                    handleClose();
                  }
                }}
                className="h-9 px-3 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center"
                title="Eliminar evento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 sm:flex-initial h-9 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !titulo.trim() || !fecha || (tipoExamen === "Parcial +" && !customParcialNum)}
                className="flex-1 sm:flex-initial h-9 px-5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-xs font-medium shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Guardando..." : editEvent ? "Guardar cambios" : "Crear Evento"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
