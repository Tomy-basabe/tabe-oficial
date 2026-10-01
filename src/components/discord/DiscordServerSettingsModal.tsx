import { useState, useEffect } from "react";
import { 
  Copy, 
  Check, 
  Link, 
  Settings, 
  Trash2, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  X, 
  LogOut,
  Image as ImageIcon 
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DiscordServer } from "@/hooks/useDiscord";

interface DiscordServerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: DiscordServer;
  onUpdateServer?: (serverId: string, updates: { name?: string; icon_url?: string | null }) => Promise<boolean>;
  onDeleteServer?: (serverId: string) => Promise<void>;
  onLeaveServer?: (serverId: string) => Promise<void>;
  onGetServerInviteCode?: (serverId: string) => Promise<string | null>;
}

export function DiscordServerSettingsModal({
  open,
  onOpenChange,
  server,
  onUpdateServer,
  onDeleteServer,
  onLeaveServer,
  onGetServerInviteCode,
}: DiscordServerSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "invite" | "delete">("general");

  // Form state
  const [name, setName] = useState(server.name);
  const [iconUrl, setIconUrl] = useState(server.icon_url || "");
  const [saving, setSaving] = useState(false);

  // Invite state: initialize immediately with reliable fallback so non-admins never get stuck loading
  const fallbackCode = server.id.slice(0, 8).toUpperCase();
  const [inviteCode, setInviteCode] = useState<string>(fallbackCode);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Delete server state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Leave server state
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isOwner = user?.id === server.owner_id;

  // Reset form when server changes or modal opens
  useEffect(() => {
    if (open) {
      setName(server.name);
      setIconUrl(server.icon_url || "");
      setConfirmDelete(false);
      setConfirmLeave(false);
      loadInviteCode();
    }
  }, [open, server.id, server.name, server.icon_url]);

  const loadInviteCode = async () => {
    setLoadingCode(true);
    try {
      if (onGetServerInviteCode) {
        // Fast promise with timeout to never freeze the UI for non-admins
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const code = await Promise.race([onGetServerInviteCode(server.id), timeoutPromise]);
        setInviteCode(code || fallbackCode);
      } else {
        setInviteCode(fallbackCode);
      }
    } catch {
      setInviteCode(fallbackCode);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onUpdateServer || !isOwner) return;

    setSaving(true);
    try {
      const ok = await onUpdateServer(server.id, {
        name: name.trim(),
        icon_url: iconUrl.trim() || null,
      });
      if (ok) {
        toast.success("Ajustes del servidor guardados");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error("No se pudieron guardar los ajustes");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard?.writeText(inviteCode);
    setCopiedCode(true);
    toast.success("Código copiado al portapapeles");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/tabetalk?invite=${inviteCode}`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    toast.success("Enlace de invitación copiado al portapapeles");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDeleteServer = async () => {
    if (!onDeleteServer || !isOwner) return;
    setDeleting(true);
    try {
      await onDeleteServer(server.id);
      toast.success("Servidor eliminado correctamente");
      onOpenChange(false);
    } catch (err) {
      toast.error("Error al eliminar el servidor");
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveServer = async () => {
    if (!onLeaveServer) return;
    setLeaving(true);
    try {
      await onLeaveServer(server.id);
      toast.success("Has salido del servidor");
      onOpenChange(false);
    } catch (err) {
      toast.error("Error al salir del servidor");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        aria-describedby="server-settings-description"
        className="bg-white text-black border-2 border-black rounded-2xl shadow-[6px_6px_0px_#000] p-0 overflow-hidden sm:max-w-xl gap-0 max-h-[90vh] flex flex-col"
      >
        {/* Header Cómic / Neobrutalista */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black bg-[#FFE600] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="w-10 h-10 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_#000] shrink-0">
              <AvatarImage src={iconUrl || server.icon_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-white text-black font-black text-sm">
                {name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-base font-black uppercase tracking-wider text-black truncate leading-tight">
                {server.name}
              </DialogTitle>
              <DialogDescription id="server-settings-description" className="text-[11px] font-bold text-black/75 mt-0.5 truncate">
                {isOwner ? "Panel de administración del servidor" : "Detalles e invitación del servidor"}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center hover:bg-neutral-100 active:translate-y-0.5 transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Pestañas Neobrutalistas */}
        <div className="flex border-b-2 border-black bg-neutral-100 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={cn(
              "px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-2 border-x-2 border-black transition-all flex items-center gap-1.5 -mb-[2px] cursor-pointer",
              activeTab === "general"
                ? "bg-white text-black border-b-2 border-b-white z-10 shadow-[0_-2px_0_0_#000]"
                : "bg-neutral-200/80 hover:bg-neutral-200 text-neutral-600 border-b-2 border-b-black"
            )}
          >
            <Settings className="w-3.5 h-3.5" />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invite")}
            className={cn(
              "px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-2 border-x-2 border-black transition-all flex items-center gap-1.5 -mb-[2px] cursor-pointer",
              activeTab === "invite"
                ? "bg-white text-black border-b-2 border-b-white z-10 shadow-[0_-2px_0_0_#000]"
                : "bg-neutral-200/80 hover:bg-neutral-200 text-neutral-600 border-b-2 border-b-black"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Invitación
          </button>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setActiveTab("delete")}
              className={cn(
                "px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-2 border-x-2 border-black transition-all flex items-center gap-1.5 -mb-[2px] text-red-600 cursor-pointer ml-auto",
                activeTab === "delete"
                  ? "bg-white text-red-600 border-b-2 border-b-white z-10 shadow-[0_-2px_0_0_#000]"
                  : "bg-neutral-200/80 hover:bg-red-50 border-b-2 border-b-black"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar Servidor
            </button>
          ) : (
            onLeaveServer && (
              <button
                type="button"
                onClick={() => setActiveTab("delete")}
                className={cn(
                  "px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl border-t-2 border-x-2 border-black transition-all flex items-center gap-1.5 -mb-[2px] text-neutral-700 cursor-pointer ml-auto",
                  activeTab === "delete"
                    ? "bg-white text-neutral-900 border-b-2 border-b-white z-10 shadow-[0_-2px_0_0_#000]"
                    : "bg-neutral-200/80 hover:bg-neutral-200 border-b-2 border-b-black"
                )}
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            )
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-4 animate-in fade-in duration-150">
              {/* Tarjeta de Icono */}
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-black bg-neutral-50 shadow-[3px_3px_0px_#000]">
                <Avatar className="w-16 h-16 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_#000] shrink-0">
                  <AvatarImage src={iconUrl || server.icon_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-[#FFE600] text-black font-black text-xl">
                    {name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-black block">
                    Icono del Servidor (URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="https://ejemplo.com/icono.png"
                      className="w-full bg-white text-black text-xs font-bold px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] focus:outline-hidden focus:bg-[#FFE600]/20 disabled:bg-neutral-100 disabled:text-neutral-500"
                      disabled={!isOwner}
                    />
                    {iconUrl && isOwner && (
                      <button
                        type="button"
                        onClick={() => setIconUrl("")}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[1px_1px_0px_#000] shrink-0 cursor-pointer"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Nombre del Servidor */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-black block">
                  Nombre del Servidor
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Grupo de Estudio Álgebra"
                  className="w-full bg-white text-black text-sm font-bold px-3.5 py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] focus:outline-hidden focus:bg-[#FFE600]/20 disabled:bg-neutral-100 disabled:text-neutral-500"
                  disabled={!isOwner}
                  required
                />
                {!isOwner && (
                  <div className="p-3 bg-neutral-100 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] text-xs font-bold text-neutral-700 mt-2">
                    🛡️ Eres miembro de este servidor. Solo el administrador puede modificar el nombre y el icono.
                  </div>
                )}
              </div>

              {/* Botón Guardar (Solo Owner) */}
              {isOwner && (
                <div className="pt-3 flex justify-end gap-2 border-t-2 border-black/10">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="px-4 py-2 bg-white hover:bg-neutral-100 text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="px-5 py-2 bg-[#00FF9D] hover:bg-[#00E58D] text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: INVITATION CODE */}
          {activeTab === "invite" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-5 rounded-xl bg-[#FFE600]/20 border-2 border-black shadow-[3px_3px_0px_#000] text-center space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-black">
                  Código de Invitación del Servidor
                </p>
                <div className="text-3xl font-mono font-black tracking-widest text-black selection:bg-[#FFE600] select-all py-1">
                  {loadingCode ? "CARGANDO..." : inviteCode}
                </div>
                <p className="text-xs font-semibold text-neutral-700 max-w-sm mx-auto">
                  Cualquier compañero puede unirse a este servidor ingresando este código o usando el enlace directo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-black font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? "¡Código Copiado!" : "Copiar Código"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Link className="w-4 h-4" />}
                  {copiedLink ? "¡Enlace Copiado!" : "Copiar Enlace Directo"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ELIMINAR SERVIDOR (O SALIR DEL SERVIDOR SI ES MIEMBRO) */}
          {activeTab === "delete" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {isOwner ? (
                // ACCIÓN DE ADMIN: ELIMINAR SERVIDOR
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-50 border-2 border-black shadow-[3px_3px_0px_#000] space-y-2">
                    <div className="flex items-center gap-2 text-red-600 font-black text-sm uppercase">
                      <ShieldAlert className="w-5 h-5 shrink-0" />
                      Eliminar Servidor Definitivamente
                    </div>
                    <p className="text-xs font-semibold text-neutral-700 leading-relaxed">
                      Esta acción eliminará de forma permanente e irreversible el servidor <strong className="text-black font-black">"{server.name}"</strong>, incluyendo todos sus canales de texto y voz, notas, historial de mensajes y miembros.
                    </p>
                  </div>

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full h-11 bg-[#ed4245] hover:bg-[#c93b3e] text-white font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Servidor
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-100 border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
                      <p className="text-xs font-black text-red-700 text-center uppercase tracking-wide">
                        ¿Confirmas que deseas eliminar "{server.name}"?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          className="flex-1 h-10 bg-white hover:bg-neutral-100 text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteServer}
                          disabled={deleting}
                          className="flex-1 h-10 bg-[#ed4245] hover:bg-[#c93b3e] text-white text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {deleting ? "Eliminando..." : "Sí, Eliminar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // ACCIÓN DE MIEMBRO: SALIR DEL SERVIDOR
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-100 border-2 border-black shadow-[3px_3px_0px_#000] space-y-2">
                    <div className="flex items-center gap-2 text-black font-black text-sm uppercase">
                      <LogOut className="w-5 h-5 shrink-0" />
                      Salir del Servidor
                    </div>
                    <p className="text-xs font-semibold text-neutral-600 leading-relaxed">
                      Dejarás de tener acceso a los canales y mensajes de <strong className="text-black font-black">"{server.name}"</strong>. Podrás volver a unirte más adelante si recibes una invitación.
                    </p>
                  </div>

                  {!confirmLeave ? (
                    <button
                      type="button"
                      onClick={() => setConfirmLeave(true)}
                      className="w-full h-11 bg-white hover:bg-neutral-100 text-neutral-800 font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Abandonar Servidor
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-200 border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
                      <p className="text-xs font-black text-black text-center uppercase tracking-wide">
                        ¿Deseas salir del servidor "{server.name}"?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmLeave(false)}
                          disabled={leaving}
                          className="flex-1 h-10 bg-white hover:bg-neutral-100 text-black text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleLeaveServer}
                          disabled={leaving}
                          className="flex-1 h-10 bg-[#ed4245] hover:bg-[#c93b3e] text-white text-xs font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {leaving ? "Saliendo..." : "Sí, Salir"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
