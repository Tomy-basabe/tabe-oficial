import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Paperclip,
  Globe,
  BrainCog,
  ImageIcon,
  Mic,
  ArrowUp,
  Square,
  X,
  ChevronDown,
  Check,
  BookOpen,
  AudioWaveform,
  Search,
  Zap,
  Sparkles,
  Brain,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { AIModelOption, PowerEffort } from "@/config/aiModels";
import { cn } from "@/lib/utils";

export const powerConfig: Record<
  PowerEffort,
  {
    name: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }
> = {
  bajo: {
    name: "Rápido",
    icon: Zap,
  },
  medio: {
    name: "Equilibrado",
    icon: Sparkles,
  },
  alto: {
    name: "Pensar",
    icon: Brain,
  },
};

export interface AttachedImageInfo {
  preview: string;
  name: string;
  base64?: string;
  mimeType?: string;
}

export interface AIPromptBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  onStopGeneration?: () => void;
  placeholder?: string;
  className?: string;

  // Multimodal image
  attachedImage: AttachedImageInfo | null;
  onRemoveImage: () => void;
  onAttachClick: () => void;

  // Embedded Model Selector
  selectedModel: AIModelOption;
  powerLevel: PowerEffort;
  onSelectPowerLevel: (level: PowerEffort) => void;
  onSelectModel?: (model: AIModelOption) => void;

  // Embedded Subject Selector
  selectedSubject: string;
  subjects?: Array<{ id: string; nombre: string; status?: string }>;
  onSelectSubject: (subject: string) => void;

  // Voice Interaction
  onOpenLiveVoice: () => void;
  isLiveVoiceActive?: boolean;
  isRecordingVoice?: boolean;
  recordingSeconds?: number;
  onStartVoiceRecording?: () => void;
  onStopVoiceRecording?: () => void;
}

const getStatusBadge = (status?: string) => {
  if (!status) return null;
  switch (status.toLowerCase()) {
    case "aprobada":
      return {
        label: "Aprobada",
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      };
    case "regular":
      return {
        label: "Regular",
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      };
    case "cursable":
      return {
        label: "Cursable",
        className:
          "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      };
    case "bloqueada":
      return {
        label: "Bloqueada",
        className:
          "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
      };
    default:
      return {
        label: status,
        className:
          "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
      };
  }
};

export const AIPromptBar: React.FC<AIPromptBarProps> = ({
  value,
  onChange,
  onSend,
  isLoading = false,
  onStopGeneration,
  placeholder = "Pregunta a TABE AI, consulta tus apuntes o pega una imagen...",
  className,
  attachedImage,
  onRemoveImage,
  onAttachClick,
  selectedModel,
  powerLevel,
  onSelectPowerLevel,
  selectedSubject,
  subjects = [],
  onSelectSubject,
  onOpenLiveVoice,
  isLiveVoiceActive = false,
  isRecordingVoice = false,
  recordingSeconds = 0,
  onStartVoiceRecording,
  onStopVoiceRecording,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea smoothly without arbitrary height jumps
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 24), 180);
    textareaRef.current.style.height = `${nextHeight}px`;
  }, [value]);

  const handleToggleMode = (mode: "search" | "think" | "image") => {
    if (mode === "search") {
      setShowSearch((prev) => !prev);
      setShowThink(false);
      setShowImage(false);
    } else if (mode === "think") {
      const next = !showThink;
      setShowThink(next);
      setShowSearch(false);
      setShowImage(false);
      onSelectPowerLevel(next ? "alto" : "medio");
    } else if (mode === "image") {
      setShowImage((prev) => !prev);
      setShowSearch(false);
      setShowThink(false);
    }
  };

  const handleSubmit = () => {
    if ((!value.trim() && !attachedImage) || isLoading) return;

    let prefix = "";
    if (showSearch) prefix = "[Search: ";
    else if (showThink) prefix = "[Think: ";
    else if (showImage) prefix = "[Image: ";

    const finalMessage = prefix ? `${prefix}${value}]` : value;
    onSend(finalMessage);

    setShowSearch(false);
    setShowThink(false);
    setShowImage(false);
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onSend("", files);
      }
    },
    [onSend]
  );

  const currentPower = powerConfig[powerLevel] || powerConfig.medio;
  const CurrentPowerIcon = currentPower.icon;
  const hasContent = Boolean(value.trim() || attachedImage);

  // Filter subjects for dropdown search
  const filteredSubjects = subjects.filter((s) =>
    s.nombre.toLowerCase().includes(subjectSearchQuery.toLowerCase())
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative w-full rounded-3xl border border-zinc-200/90 dark:border-white/10 focus-within:border-zinc-400 dark:focus-within:border-white/20 bg-white dark:bg-[#212121] shadow-md transition-all duration-200 px-4 pt-3 pb-2.5",
        isDragOver && "border-primary border-dashed bg-zinc-50 dark:bg-zinc-900/50",
        isLoading && "border-zinc-400 dark:border-zinc-600",
        className
      )}
    >
      {/* ── TOP ROW: Context Subject Badge & Attachment Indicator ── */}
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        {/* Left: Compact Subject Dropdown Micro-badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer focus:outline-none select-none",
                selectedSubject && selectedSubject !== "Todas las materias"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
              title="Enfocar contexto en una materia"
            >
              <BookOpen className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate max-w-[180px] sm:max-w-[260px]">
                {selectedSubject && selectedSubject !== "Todas las materias"
                  ? selectedSubject
                  : "Todas las materias"}
              </span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="w-64 sm:w-72 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95"
          >
            {/* Search filter input inside subject menu */}
            <div className="flex items-center gap-1.5 px-2 py-1 mb-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700/60">
              <Search className="w-3 h-3 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                placeholder="Buscar materia..."
                className="bg-transparent border-none text-[11px] font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none w-full"
              />
              {subjectSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSubjectSearchQuery("")}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
              <button
                type="button"
                onClick={() => {
                  onSelectSubject("Todas las materias");
                  setSubjectSearchQuery("");
                }}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer",
                  selectedSubject === "Todas las materias"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                )}
              >
                <span>Todas las materias</span>
                {selectedSubject === "Todas las materias" && (
                  <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                )}
              </button>

              {filteredSubjects.map((sub) => {
                const isSelected = selectedSubject === sub.nombre;
                const badgeInfo = getStatusBadge(sub.status);

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      onSelectSubject(sub.nombre);
                      setSubjectSearchQuery("");
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer",
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
                    )}
                  >
                    <span className="truncate">{sub.nombre}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {badgeInfo && (
                        <span
                          className={cn(
                            "text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border",
                            badgeInfo.className
                          )}
                        >
                          {badgeInfo.label}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right Indicator: Active Attachment Badge */}
        {attachedImage && (
          <div className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-md px-2 py-0.5 animate-in fade-in">
            <img
              src={attachedImage.preview}
              alt="Adjunto"
              className="w-3.5 h-3.5 rounded object-cover border border-zinc-200 dark:border-zinc-700"
            />
            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
              {attachedImage.name}
            </span>
            <button
              type="button"
              onClick={onRemoveImage}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ml-0.5"
              title="Quitar archivo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── LIVE RECORDING BANNER (If Recording Active and not in Live Voice Mode) ── */}
      {isRecordingVoice && !isLiveVoiceActive && (
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Grabando audio (
              {Math.floor(recordingSeconds / 60)}:
              {(recordingSeconds % 60).toString().padStart(2, "0")})
            </span>
          </div>
          <button
            type="button"
            onClick={onStopVoiceRecording}
            className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-red-700 transition-colors cursor-pointer"
          >
            Detener
          </button>
        </div>
      )}

      {/* ── MAIN TEXTAREA ── */}
      <div className="w-full">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            showSearch
              ? "Buscar en la web académica..."
              : showThink
              ? "Razonar problema complejo paso a paso..."
              : showImage
              ? "Describe la imagen, ilustración o esquema que deseas generar..."
              : placeholder
          }
          disabled={isLoading || isRecordingVoice}
          rows={1}
          className="w-full bg-transparent border-none p-0 text-sm sm:text-base font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none resize-none leading-relaxed overflow-y-auto"
          style={{ minHeight: "24px", maxHeight: "180px" }}
        />
      </div>

      {/* ── BOTTOM ACTIONS TOOLBAR (h-8 / h-9) ── */}
      <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-800/60">
        {/* Left Side: Attachment + Model Chip + Capability Toggles */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto scrollbar-none py-0.5">
          {/* Attach Button (+) */}
          <button
            type="button"
            onClick={onAttachClick}
            disabled={isLoading || isRecordingVoice}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 transition-colors shrink-0 cursor-pointer disabled:opacity-40"
            title="Adjuntar imagen, apunte o archivo"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Selector de Nivel de IA Sencillo (* Rápido, * Equilibrado, * Pensar) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isLoading}
                className="group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-zinc-200/90 dark:border-white/10 bg-zinc-50/90 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shrink-0 focus:outline-none shadow-2xs hover:shadow-xs select-none"
                title="Elegir nivel de IA"
              >
                <CurrentPowerIcon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-foreground transition-colors" strokeWidth={2} />
                <span className="font-medium text-xs tracking-tight text-foreground">
                  {currentPower.name}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400 dark:text-zinc-500 ml-0.5 transition-transform duration-150 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="w-44 p-1 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="space-y-0.5">
                {(["bajo", "medio", "alto"] as PowerEffort[]).map((level) => {
                  const cfg = powerConfig[level];
                  const Icon = cfg.icon;
                  const isSelected = powerLevel === level;

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        onSelectPowerLevel(level);
                        setShowThink(level === "alto");
                      }}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer text-left",
                        isSelected
                          ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 font-semibold"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={2} />
                        <span>{cfg.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" strokeWidth={2.2} />
                      )}
                    </button>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Subtle Vertical Divider */}
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-0.5 shrink-0" />

          {/* Quick Capability Toggles */}
          {/* 1. Web Search */}
          <button
            type="button"
            onClick={() => handleToggleMode("search")}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border",
              showSearch
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
            title="Activar Búsqueda Web"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Web</span>
          </button>

          {/* 2. Deep Think */}
          <button
            type="button"
            onClick={() => handleToggleMode("think")}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border",
              showThink
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
            title="Activar Razonamiento Profundo"
          >
            <BrainCog className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Pensar</span>
          </button>

          {/* 3. Image Generation Mode */}
          <button
            type="button"
            onClick={() => handleToggleMode("image")}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border",
              showImage
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
            title="Modo Generar Imágenes con IA"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Imágenes</span>
          </button>
        </div>


        {/* Right Side: Live Voice pill/circle + Mic + Send */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {/* Live Voice Button (Botón circular azul estilo ChatGPT) */}
          <button
            type="button"
            onClick={onOpenLiveVoice}
            disabled={isLoading}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer select-none",
              isLiveVoiceActive
                ? "bg-emerald-500 text-white animate-pulse shadow-md"
                : "bg-[#1e60f0] hover:bg-[#1853d6] text-white shadow-xs hover:scale-105 active:scale-95"
            )}
            title={isLiveVoiceActive ? "Finalizar voz" : "Conversar por voz en vivo"}
          >
            <AudioWaveform
              className={cn(
                "w-4 h-4 stroke-[2.2] transition-transform",
                isLiveVoiceActive ? "scale-110" : ""
              )}
            />
          </button>

          {/* Mic dictation */}
          {onStartVoiceRecording && (
            <button
              type="button"
              onClick={isRecordingVoice ? onStopVoiceRecording : onStartVoiceRecording}
              disabled={isLoading}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer",
                isRecordingVoice
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              )}
              title={isRecordingVoice ? "Detener grabación" : "Dictar audio"}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {/* Solid Send Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="Detener respuesta"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasContent}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer",
                hasContent
                  ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 active:scale-95"
                  : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
              )}
              title="Enviar mensaje"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.25]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

