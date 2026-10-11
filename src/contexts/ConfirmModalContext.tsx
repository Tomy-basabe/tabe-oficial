import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, X, Check } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  badgeText?: string;
  /** Si es true, oculta el botón de cancelar actuando como alerta informativa */
  alertOnly?: boolean;
}

export type ConfirmInput = string | ConfirmOptions;

interface ModalState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface ConfirmContextType {
  confirm: (input: ConfirmInput) => Promise<boolean>;
}

const defaultOptions: ConfirmOptions = {
  title: "¿Estás seguro?",
  description: "Esta acción no se puede deshacer.",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  variant: "danger",
};

const ConfirmContext = createContext<ConfirmContextType | null>(null);

// Referencia global para permitir confirmaciones imperativas fuera del árbol de React si fuese necesario
let globalConfirmResolver: ((input: ConfirmInput) => Promise<boolean>) | null = null;

export const confirmGlobal = (input: ConfirmInput): Promise<boolean> => {
  if (globalConfirmResolver) {
    return globalConfirmResolver(input);
  }
  // Fallback seguro si se invoca antes de montar el Provider
  const msg = typeof input === "string" ? input : input.title;
  return Promise.resolve(window.confirm(msg));
};

export const ConfirmModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const activeResolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmInput): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // Si había uno abierto previamente, resolverlo como cancelado
      if (activeResolveRef.current) {
        activeResolveRef.current(false);
      }

      let parsed: ConfirmOptions;
      if (typeof input === "string") {
        parsed = {
          title: input,
          description: "Esta acción no se puede deshacer.",
          confirmText: "Confirmar",
          cancelText: "Cancelar",
          variant: "danger",
        };
      } else {
        parsed = {
          title: input.title,
          description: input.description,
          confirmText: input.confirmText ?? (input.variant === "info" ? "Aceptar" : "Confirmar"),
          cancelText: input.cancelText ?? "Cancelar",
          variant: input.variant ?? "danger",
          badgeText: input.badgeText,
          alertOnly: input.alertOnly,
        };
      }

      activeResolveRef.current = resolve;
      setModalState({
        isOpen: true,
        options: parsed,
        resolve,
      });

      try {
        ComicAudio.playPop();
      } catch {}
    });
  }, []);

  useEffect(() => {
    globalConfirmResolver = confirm;
    return () => {
      if (globalConfirmResolver === confirm) {
        globalConfirmResolver = null;
      }
    };
  }, [confirm]);

  const handleConfirm = useCallback(() => {
    if (activeResolveRef.current) {
      activeResolveRef.current(true);
      activeResolveRef.current = null;
    }
    setModalState(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (activeResolveRef.current) {
      activeResolveRef.current(false);
      activeResolveRef.current = null;
    }
    setModalState(null);
  }, []);

  // Manejo de teclado (Escape y Enter)
  useEffect(() => {
    if (!modalState?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter") {
        // Prevenir si el foco está en el botón cancelar
        if (document.activeElement?.getAttribute("data-cancel-button") === "true") {
          return;
        }
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalState?.isOpen, handleCancel, handleConfirm]);

  const options = modalState?.options || defaultOptions;
  const variant = options.variant || "danger";

  const getBadgeConfig = () => {
    if (options.badgeText) {
      return {
        text: options.badgeText,
        bg: variant === "danger" ? "bg-[#FF5C5C]" : variant === "warning" ? "bg-[#FFD700]" : "bg-[#00E5FF]",
      };
    }
    switch (variant) {
      case "warning":
        return { text: "ADVERTENCIA", bg: "bg-[#FFD700]" };
      case "info":
        return { text: "INFORMACIÓN", bg: "bg-[#00E5FF]" };
      case "danger":
      default:
        return { text: "¡ATENCIÓN!", bg: "bg-[#FF5C5C]" };
    }
  };

  const badgeConfig = getBadgeConfig();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {modalState?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={handleCancel}
        >
          <div
            className="relative w-full max-w-md bg-[#FDFBF7] dark:bg-[#1E1E24] text-foreground border-4 border-black dark:border-white rounded-2xl shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_#fff] p-6 animate-in zoom-in-95 duration-150 select-none overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera / Badge */}
            <div className="flex items-center justify-between gap-3 border-b-4 border-black dark:border-white pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider text-black border-2 border-black shadow-[2px_2px_0px_#000]",
                    badgeConfig.bg
                  )}
                >
                  {badgeConfig.text}
                </span>
                {variant === "danger" && <AlertTriangle className="w-5 h-5 text-[#FF5C5C] stroke-[2.5]" />}
                {variant === "warning" && <AlertCircle className="w-5 h-5 text-[#FFD700] stroke-[2.5]" />}
                {variant === "info" && <Info className="w-5 h-5 text-[#00E5FF] stroke-[2.5]" />}
              </div>

              <button
                type="button"
                onClick={handleCancel}
                aria-label="Cerrar modal"
                className="w-8 h-8 rounded-lg border-2 border-black dark:border-white bg-white dark:bg-zinc-800 text-black dark:text-white flex items-center justify-center shadow-[2px_2px_0px_#000] dark:shadow-[2px_2px_0px_#fff] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Contenido principal */}
            <div className="space-y-2 py-1">
              <h3 className="text-xl font-black uppercase tracking-tight text-foreground leading-snug">
                {options.title}
              </h3>
              {options.description && (
                <p className="text-sm font-bold text-foreground/80 leading-relaxed">
                  {options.description}
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-5 mt-2 border-t-2 border-black/10 dark:border-white/10">
              {!options.alertOnly && (
                <button
                  type="button"
                  data-cancel-button="true"
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black dark:border-white bg-white dark:bg-zinc-800 text-black dark:text-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#fff] hover:bg-neutral-100 dark:hover:bg-zinc-700 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  {options.cancelText}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-black uppercase text-xs sm:text-sm tracking-wider border-2 border-black dark:border-white shadow-[3px_3px_0px_#000] dark:shadow-[3px_3px_0px_#fff] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  variant === "danger"
                    ? "bg-[#FF5C5C] hover:bg-[#ff4444] text-black"
                    : variant === "warning"
                    ? "bg-[#FFD700] hover:bg-[#f5cb00] text-black"
                    : "bg-[#00E5FF] hover:bg-[#00d0e6] text-black"
                )}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    // Si no está dentro de ConfirmModalProvider, usar confirmGlobal de fallback
    return { confirm: confirmGlobal };
  }
  return context;
};

export const useConfirmModal = useConfirm;
