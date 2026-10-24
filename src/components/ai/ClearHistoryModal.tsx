import { useEffect } from "react";
import { Trash2, MessageSquare, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionsCount: number;
  personaName?: string;
  isDeleting?: boolean;
}

export function ClearHistoryModal({
  isOpen,
  onClose,
  onConfirm,
  sessionsCount,
  personaName = "este asistente",
  isDeleting = false,
}: ClearHistoryModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && !isDeleting) {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-history-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200/80 dark:border-zinc-800/90 rounded-3xl shadow-2xl max-w-sm w-full p-6 overflow-hidden flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cerrar discreto */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icono de advertencia en pill suave */}
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-2xs">
          <Trash2 className="w-5 h-5 stroke-[2]" />
        </div>

        {/* Título */}
        <h3
          id="clear-history-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mb-1.5"
        >
          ¿Limpiar todo el historial?
        </h3>

        {/* Descripción */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 max-w-xs">
          Se eliminarán permanentemente todas las conversaciones de{" "}
          <strong className="text-zinc-700 dark:text-zinc-200 font-medium">
            {personaName}
          </strong>
          . Esta acción no se puede deshacer.
        </p>

        {/* Resumen del impacto */}
        <div className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-3 mb-5 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" /> Chats a eliminar
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 px-2 py-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-[11px]">
            {sessionsCount} {sessionsCount === 1 ? "conversación" : "conversaciones"}
          </span>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2.5 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 h-10 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 h-10 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Borrando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
