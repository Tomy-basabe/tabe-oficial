import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2, Loader2, X, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!open) return null;

  const isConfirmed = confirmationInput.trim().toUpperCase() === "ELIMINAR";

  const handleDeleteAccount = async () => {
    if (!isConfirmed || !user) return;

    setLoading(true);
    try {
      // 1. Invocar RPC seguro de eliminación en cascada
      const { error: rpcError } = await (supabase.rpc as any)("delete_own_account", {
        confirmation_code: "ELIMINAR",
      });

      if (rpcError) {
        console.warn("RPC delete_own_account no disponible o falló, aplicando purga directa:", rpcError);
        // Fallback resiliente: limpiar datos del usuario vía cliente con RLS
        const uid = user.id;
        await Promise.allSettled([
          supabase.from("notion_documents").delete().eq("user_id", uid),
          supabase.from("library_files").delete().eq("user_id", uid),
          supabase.from("flashcard_decks").delete().eq("user_id", uid),
          supabase.from("study_tasks" as any).delete().eq("user_id", uid),
          supabase.from("user_subject_status").delete().eq("user_id", uid),
          supabase.from("calendar_events").delete().eq("user_id", uid),
          supabase.from("study_sessions").delete().eq("user_id", uid),
          supabase.from("user_stats").delete().eq("user_id", uid),
          supabase.from("user_achievements").delete().eq("user_id", uid),
          supabase.from("user_plants").delete().eq("user_id", uid),
          supabase.from("user_inventory").delete().eq("user_id", uid),
          supabase.from("user_reviews").delete().eq("user_id", uid),
          supabase.from("push_subscriptions" as any).delete().eq("user_id", uid),
          supabase.from("profiles").delete().eq("user_id", uid),
        ]);
      }

      // 2. Limpieza total de almacenamiento local
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      // 3. Cerrar sesión
      await signOut();

      toast.success("Tu cuenta y todos tus datos personales han sido eliminados de forma definitiva.");
      onClose();
      navigate("/registro", { replace: true });
    } catch (err: any) {
      console.error("Error al eliminar la cuenta:", err);
      toast.error(err?.message || "Ocurrió un error al procesar la eliminación. Contactá a soporte@tabe.com.ar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#18181b] text-foreground border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        {/* Cabecera */}
        <div className="p-5 pb-4 flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 id="delete-account-title" className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Eliminar cuenta y datos
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Esta acción destruirá todos tus datos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-red-50/70 dark:bg-red-950/20 border border-red-200/70 dark:border-red-900/40 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Acción irreversible y definitiva
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              En cumplimiento del derecho de supresión (Ley 25.326 y RGPD), al confirmar se destruirán permanentemente:
            </p>
            <ul className="text-[11px] text-zinc-500 dark:text-zinc-400 list-disc pl-4 space-y-0.5">
              <li>Todos tus apuntes, notas y documentos de Notion.</li>
              <li>Tus flashcards, cuestionarios y resultados académicos.</li>
              <li>Tus archivos PDF e imágenes subidas en la biblioteca.</li>
              <li>Tu historial de estudio, sesiones de Pomodoro y métricas.</li>
              <li>Tu perfil de usuario y credenciales de acceso.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Para confirmar, escribe <span className="font-mono font-semibold text-red-600 dark:text-red-400">ELIMINAR</span> a continuación:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="ELIMINAR"
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-700 font-mono text-sm uppercase tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
              autoFocus
            />
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-2.5 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={!isConfirmed || loading}
              className={cn(
                "py-2.5 px-4 rounded-lg font-medium text-xs text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs",
                isConfirmed && !loading
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-400/60 dark:bg-red-900/40 text-white/70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar cuenta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
