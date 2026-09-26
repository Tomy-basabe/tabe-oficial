import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { NotionDocument } from "@/hooks/useNotionDocuments";
import { CollabUser } from "@/hooks/useNotionCollab";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Check,
  RefreshCw,
  Users,
  Eye,
  Edit3,
  ShieldAlert,
  Globe,
  Lock,
} from "lucide-react";

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: NotionDocument | null;
  onUpdateSharing: (updates: {
    is_shared: boolean;
    share_permission: "view" | "edit";
    share_token: string | null;
  }) => Promise<boolean>;
  activeCollaborators?: CollabUser[];
  isOwner: boolean;
}

export function ShareDocumentModal({
  isOpen,
  onClose,
  document,
  onUpdateSharing,
  activeCollaborators = [],
  isOwner,
}: ShareDocumentModalProps) {
  const [isShared, setIsShared] = useState<boolean>(false);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setIsShared(Boolean(document.is_shared));
      setPermission(document.share_permission || "view");
      setShareToken(document.share_token || null);
    }
  }, [document, isOpen]);

  if (!document) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareToken ? `${origin}/notion?share=${shareToken}` : "";

  const handleToggleShare = async (checked: boolean) => {
    if (!isOwner) return;

    let token = shareToken;
    if (checked && !token) {
      token = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      setShareToken(token);
    }

    setIsShared(checked);
    setSaving(true);
    const success = await onUpdateSharing({
      is_shared: checked,
      share_permission: permission,
      share_token: checked ? token : shareToken,
    });
    setSaving(false);

    if (success) {
      toast.success(checked ? "Enlace de colaboración activado" : "Enlace desactivado");
    } else {
      setIsShared(!checked);
      toast.error("Error al actualizar estado de compartir");
    }
  };

  const handleChangePermission = async (newPerm: "view" | "edit") => {
    if (!isOwner) return;
    setPermission(newPerm);

    if (isShared) {
      setSaving(true);
      const success = await onUpdateSharing({
        is_shared: true,
        share_permission: newPerm,
        share_token: shareToken,
      });
      setSaving(false);

      if (success) {
        toast.success(newPerm === "edit" ? "Permiso cambiado a Lectura y Edición" : "Permiso cambiado a Solo Lectura");
      }
    }
  };

  const handleRegenerateToken = async () => {
    if (!isOwner) return;
    const newToken = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    setShareToken(newToken);
    setSaving(true);
    const success = await onUpdateSharing({
      is_shared: isShared,
      share_permission: permission,
      share_token: newToken,
    });
    setSaving(false);

    if (success) {
      toast.success("Nuevo enlace generado. El enlace anterior ha sido revocado.");
    } else {
      toast.error("Error al regenerar enlace");
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] bg-card text-foreground border-4 border-foreground rounded-none shadow-[8px_8px_0_0_hsl(var(--foreground))] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-3 border-b-2 border-foreground/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-foreground bg-[#FFD700] text-black flex items-center justify-center font-black shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">
                Apunte Cooperativo
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted-foreground">
                Comparte este apunte mediante un enlace con permisos configurables.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Document Summary */}
          <div className="p-3 bg-muted border-2 border-foreground flex items-center gap-3">
            <span className="text-2xl">{document.emoji || "📝"}</span>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-foreground truncate">
                {document.titulo || "Sin título"}
              </h4>
              <p className="text-[11px] font-bold text-muted-foreground">
                {isOwner ? "Eres el creador de este apunte" : `Creado por ${document.owner?.nombre || "un compañero"}`}
              </p>
            </div>
            {isShared ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-[#BFFF00] text-black border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))]">
                <Globe className="w-3 h-3" /> Enlace Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-muted-foreground/20 text-foreground border-2 border-foreground">
                <Lock className="w-3 h-3" /> Privado
              </span>
            )}
          </div>

          {/* Toggle Share Switch (Owner only) */}
          {isOwner ? (
            <div className="flex items-center justify-between p-3.5 bg-background border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              <div className="space-y-0.5">
                <label className="text-sm font-black uppercase cursor-pointer flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Habilitar enlace de colaboración
                </label>
                <p className="text-xs font-semibold text-muted-foreground">
                  Cualquier persona con el enlace podrá acceder al apunte.
                </p>
              </div>
              <Switch
                checked={isShared}
                onCheckedChange={handleToggleShare}
                disabled={saving}
                className="data-[state=checked]:bg-[#BFFF00] data-[state=checked]:border-2 data-[state=checked]:border-foreground"
              />
            </div>
          ) : (
            <div className="p-3 bg-muted border-2 border-foreground text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Solo el creador puede activar, desactivar o revocar el enlace de este apunte.</span>
            </div>
          )}

          {/* Sharing Options when enabled */}
          {isShared && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Permission Selector */}
              {isOwner && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Permiso para quienes tengan el enlace:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangePermission("view")}
                      disabled={saving}
                      className={`flex items-center justify-center gap-2 p-2.5 border-2 border-foreground font-black text-xs uppercase transition-all shadow-[2px_2px_0_0_hsl(var(--foreground))] ${
                        permission === "view"
                          ? "bg-[#00E5FF] text-black ring-2 ring-foreground"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      Solo Lectura (Ver)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangePermission("edit")}
                      disabled={saving}
                      className={`flex items-center justify-center gap-2 p-2.5 border-2 border-foreground font-black text-xs uppercase transition-all shadow-[2px_2px_0_0_hsl(var(--foreground))] ${
                        permission === "edit"
                          ? "bg-[#FF9B71] text-black ring-2 ring-foreground"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      Lectura y Edición
                    </button>
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                    {permission === "edit"
                      ? "⚡ Los invitados podrán escribir en tiempo real (requiere tener cuenta en TABE)."
                      : "👁️ Los invitados solo podrán ver y leer el apunte sin modificarlo."}
                  </p>
                </div>
              )}

              {/* Link Input & Copy */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Enlace para compartir:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-background border-2 border-foreground select-all text-foreground truncate focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 bg-[#BFFF00] text-black hover:bg-[#a8e600] border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] font-black text-xs uppercase shrink-0 rounded-none transition-all flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>

              {/* Revoke / Regenerate Token Button */}
              {isOwner && (
                <div className="pt-1 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    ¿Quieres revocar el enlace anterior?
                  </p>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={saving}
                    className="flex items-center gap-1 text-[11px] font-black uppercase text-red-500 hover:text-red-600 underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generar nuevo enlace
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Collaborators Section */}
          <div className="pt-3 border-t-2 border-foreground/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Conectados en este apunte ({activeCollaborators.length})
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                En tiempo real
              </span>
            </div>

            {activeCollaborators.length === 0 ? (
              <p className="text-xs text-muted-foreground font-semibold italic p-2 bg-muted/40 border border-foreground/10">
                No hay otros compañeros conectados a este apunte en este momento.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {activeCollaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center gap-2 px-2.5 py-1 bg-background border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-xs font-black"
                  >
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="w-5 h-5 rounded-full border border-foreground object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(c.name || "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[120px]">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t-2 border-foreground/20 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="px-5 bg-card text-foreground hover:bg-muted border-2 border-foreground font-black text-xs uppercase rounded-none shadow-[2px_2px_0_0_hsl(var(--foreground))]"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
