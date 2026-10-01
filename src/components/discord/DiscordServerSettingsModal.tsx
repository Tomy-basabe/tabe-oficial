import { useState, useEffect } from "react";
import { Copy, Check, Link, Settings, Trash2, ShieldAlert, Sparkles, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DiscordServer } from "@/hooks/useDiscord";

interface DiscordServerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: DiscordServer;
  onUpdateServer?: (serverId: string, updates: { name?: string; icon_url?: string | null }) => Promise<boolean>;
  onDeleteServer?: (serverId: string) => Promise<void>;
  onGetServerInviteCode?: (serverId: string) => Promise<string | null>;
}

export function DiscordServerSettingsModal({
  open,
  onOpenChange,
  server,
  onUpdateServer,
  onDeleteServer,
  onGetServerInviteCode,
}: DiscordServerSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "invite" | "danger">("general");

  // Form state
  const [name, setName] = useState(server.name);
  const [iconUrl, setIconUrl] = useState(server.icon_url || "");
  const [saving, setSaving] = useState(false);

  // Invite state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Danger state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = user?.id === server.owner_id;

  // Reset form when server changes or modal opens
  useEffect(() => {
    if (open) {
      setName(server.name);
      setIconUrl(server.icon_url || "");
      setConfirmDelete(false);
      loadInviteCode();
    }
  }, [open, server.id, server.name, server.icon_url]);

  const loadInviteCode = async () => {
    setLoadingCode(true);
    try {
      if (onGetServerInviteCode) {
        const code = await onGetServerInviteCode(server.id);
        setInviteCode(code || server.id.slice(0, 8).toUpperCase());
      } else {
        setInviteCode(server.id.slice(0, 8).toUpperCase());
      }
    } catch {
      setInviteCode(server.id.slice(0, 8).toUpperCase());
    } finally {
      setLoadingCode(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onUpdateServer) return;

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
    if (!onDeleteServer) return;
    setDeleting(true);
    try {
      await onDeleteServer(server.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 bg-muted/20 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-primary/20">
              <AvatarImage src={iconUrl || server.icon_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl font-bold font-orbitron text-primary">
                Ajustes de {server.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Administra la configuración, invitaciones y permisos de este servidor.
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "general"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invite")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "invite"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Código de Invitación
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setActiveTab("danger")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "danger"
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "text-destructive hover:bg-destructive/10"
                }`}
              >
                Zona de Peligro
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* TAB: GENERAL */}
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                <Avatar className="w-16 h-16 ring-2 ring-primary/30 shrink-0">
                  <AvatarImage src={iconUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                    {name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Icono del Servidor (URL)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      placeholder="https://ejemplo.com/icono.png"
                      className="bg-background border-input text-xs"
                      disabled={!isOwner}
                    />
                    {iconUrl && isOwner && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIconUrl("")}
                        className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Nombre del Servidor
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Grupo de Estudio Álgebra"
                  className="bg-background border-input text-sm"
                  disabled={!isOwner}
                  required
                />
                {!isOwner && (
                  <p className="text-[11px] text-muted-foreground">
                    Solo el creador del servidor puede modificar estos ajustes.
                  </p>
                )}
              </div>

              {isOwner && (
                <div className="pt-2 flex justify-end gap-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                  >
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* TAB: INVITE CODE */}
          {activeTab === "invite" && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Código de Invitación Único
                </p>
                <div className="text-3xl font-mono font-black tracking-widest text-primary selection:bg-primary/30 select-all">
                  {loadingCode ? "CARGANDO..." : inviteCode || "NO DISPONIBLE"}
                </div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Comparte este código con tus compañeros para que se unan directamente al servidor desde Tabetalk.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!inviteCode}
                  className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs h-10 border border-border"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? "¡Código Copiado!" : "Copiar Código"}
                </Button>

                <Button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!inviteCode}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 shadow-lg shadow-primary/20"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                  {copiedLink ? "¡Enlace Copiado!" : "Copiar Enlace Directo"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB: DANGER ZONE */}
          {activeTab === "danger" && isOwner && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  Zona de Peligro: Eliminación Permanente
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Eliminar este servidor borrará de forma permanente e irreversible todos los canales de texto y voz, todos los mensajes del chat y las membresías asociadas en la base de datos.
                </p>
              </div>

              {!confirmDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 font-bold text-xs h-11"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Servidor Definitivamente
                </Button>
              ) : (
                <div className="p-4 rounded-xl bg-destructive/20 border border-destructive space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs font-bold text-destructive text-center">
                    ¿Estás 100% seguro de eliminar "{server.name}"? Esta acción no se puede revertir.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="flex-1 text-xs"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteServer}
                      disabled={deleting}
                      className="flex-1 text-xs font-bold"
                    >
                      {deleting ? "Eliminando..." : "Sí, Eliminar Servidor"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
