import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, X, Trash2, Check } from "lucide-react";
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
  console.warn("ConfirmModalProvider no está montado aún.");
  return Promise.resolve(false);
};

export const ConfirmModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const activeResolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmInput): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (activeResolveRef.current) {
        activeResolveRef.current(false);
      }

      let parsed: ConfirmOptions;
      if (typeof input === "string") {
        parsed = {
          title: input,
          description: "Esta acción no se puede deshacer.",
          confirmText: "Eliminar",
          cancelText: "Cancelar",
          variant: "danger",
        };
      } else {
        parsed = {
          title: input.title,
          description: input.description,
          confirmText: input.confirmText ?? (input.variant === "info" ? "Aceptar" : input.variant === "danger" ? "Eliminar" : "Confirmar"),
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

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {modalState?.isOpen && (
          <motion.div
            key="confirm-modal-backdrop"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 select-none overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                {/* Ícono sutil Notion/Apple */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    variant === "danger" && "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200/70 dark:border-red-900/50",
                    variant === "warning" && "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/70 dark:border-amber-900/50",
                    variant === "info" && "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/70 dark:border-blue-900/50"
                  )}
                >
                  {variant === "danger" && <Trash2 className="w-5 h-5" />}
                  {variant === "warning" && <AlertTriangle className="w-5 h-5" />}
                  {variant === "info" && <Info className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {options.title}
                  </h3>
                  {options.description && (
                    <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                      {options.description}
                    </p>
                  )}
                </div>

                {/* Botón Cerrar */}
                <button
                  type="button"
                  onClick={handleCancel}
                  aria-label="Cerrar modal"
                  className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Botones de acción sobrios */}
              <div className="flex items-center justify-end gap-2.5 pt-6 mt-2">
                {!options.alertOnly && (
                  <button
                    type="button"
                    data-cancel-button="true"
                    onClick={handleCancel}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-zinc-200/90 dark:border-zinc-700/80 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    {options.cancelText}
                  </button>
                )}

                <button
                  type="button"
                  autoFocus
                  onClick={handleConfirm}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-white transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5",
                    variant === "danger" && "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500",
                    variant === "warning" && "bg-amber-600 hover:bg-amber-700 text-white",
                    variant === "info" && "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white"
                  )}
                >
                  {variant === "danger" && <Trash2 className="w-3.5 h-3.5" />}
                  {variant !== "danger" && <Check className="w-3.5 h-3.5" />}
                  <span>{options.confirmText}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    return { confirm: confirmGlobal };
  }
  return context;
};

export const useConfirmModal = useConfirm;
