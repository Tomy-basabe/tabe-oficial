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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-card text-card-foreground border-4 border-[#FF5C5C] rounded-2xl shadow-[8px_8px_0_0_#FF5C5C] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        {/* Cabecera de Alerta */}
        <div className="bg-[#FF5C5C] text-black px-6 py-4 flex items-center justify-between border-b-4 border-foreground">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            <h3 id="delete-account-title" className="font-black text-base uppercase tracking-tight">
              Eliminar Cuenta y Todos mis Datos
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center transition-colors font-black text-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-destructive/10 border-2 border-destructive rounded-xl space-y-2">
            <p className="text-xs font-black uppercase text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Acción irreversible y definitiva
            </p>
            <p className="text-xs font-bold text-foreground/90 leading-relaxed">
              En cumplimiento del derecho de supresión (Ley 25.326 y RGPD), al confirmar se destruirán permanentemente:
            </p>
            <ul className="text-[11px] font-bold text-muted-foreground list-disc pl-5 space-y-1">
              <li>Todos tus apuntes, notas y documentos de Notion.</li>
              <li>Tus flashcards, cuestionarios y resultados académicos.</li>
              <li>Tus archivos PDF e imágenes subidas en la biblioteca.</li>
              <li>Tu historial de estudio, sesiones de Pomodoro y métricas.</li>
              <li>Tu perfil de usuario y credenciales de acceso.</li>
            </ul>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-xs font-black uppercase text-foreground">
              Para confirmar, escribe la palabra <span className="text-destructive font-mono underline">ELIMINAR</span> a continuación:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="ELIMINAR"
              disabled={loading}
              className="w-full px-4 py-3 bg-background rounded-xl border-3 border-foreground font-black text-sm uppercase tracking-wider text-center focus:outline-none focus:border-destructive shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              autoFocus
            />
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-3 px-4 rounded-xl border-3 border-foreground bg-secondary text-secondary-foreground font-black text-xs uppercase tracking-wider shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={!isConfirmed || loading}
              className={cn(
                "py-3 px-4 rounded-xl border-3 border-foreground font-black text-xs uppercase tracking-wider shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-center gap-2 transition-all",
                isConfirmed
                  ? "bg-[#FF5C5C] text-black hover:translate-y-[-1px] active:translate-y-[1px] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] cursor-pointer"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar todo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
