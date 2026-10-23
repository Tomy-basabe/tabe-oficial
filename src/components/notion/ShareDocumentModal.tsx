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
import { cn } from "@/lib/utils";
import { TabeIconRenderer } from "./TabeIcons";

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: NotionDocument | null;
  onUpdateSharing: (updates: {
    is_shared: boolean;
    share_permission: "view" | "edit";
    share_token: string | null;
    is_public?: boolean;
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
  const tokenToUse = shareToken || document.id;
  const shareUrl = `${origin}/apuntes?share=${tokenToUse}`;

  const handleToggleShare = async (checked: boolean) => {
    if (!isOwner) return;

    let token = shareToken || document.id;
    if (checked && !token) {
      token = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      setShareToken(token);
    }

    setIsShared(checked);
    setSaving(true);
    try {
      const ok = await onUpdateSharing({
        is_shared: checked,
        share_permission: permission,
        share_token: checked ? token : shareToken,
      });
      if (ok) {
        toast.success(checked ? "Enlace de colaboración activado" : "Enlace desactivado");
      } else {
        setIsShared(!checked);
      }
    } catch {
      setIsShared(!checked);
      toast.error("Error al actualizar la configuración de compartir");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePermission = async (newPerm: "view" | "edit") => {
    if (!isOwner || newPerm === permission) return;

    setPermission(newPerm);
    setSaving(true);
    try {
      const ok = await onUpdateSharing({
        is_shared: isShared,
        share_permission: newPerm,
        share_token: shareToken,
      });
      if (ok) {
        toast.success(`Permiso actualizado a ${newPerm === "edit" ? "edición" : "solo lectura"}`);
      } else {
        setPermission(permission);
      }
    } catch {
      setPermission(permission);
      toast.error("Error al cambiar permisos");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!isOwner) return;

    const newToken = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    setSaving(true);
    try {
      const ok = await onUpdateSharing({
        is_shared: isShared,
        share_permission: permission,
        share_token: newToken,
      });
      if (ok) {
        setShareToken(newToken);
        toast.success("Nuevo enlace generado. El anterior quedó invalidado.");
      }
    } catch {
      toast.error("Error al regenerar enlace");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Compartir Apunte
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Colabora en tiempo real mediante un enlace seguro
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Document Summary Card */}
          <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center">
              <TabeIconRenderer iconId={document.emoji || "book"} size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {document.titulo || "Sin título"}
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isOwner ? "Eres el autor de este apunte" : `Creado por ${document.owner?.nombre || "un compañero"}`}
              </p>
            </div>
            {isShared ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full shrink-0">
                <Globe className="w-3 h-3" /> Activo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 rounded-full shrink-0">
                <Lock className="w-3 h-3" /> Privado
              </span>
            )}
          </div>

          {/* Toggle Share Switch (Owner only) */}
          {isOwner ? (
            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-2xs">
              <div className="space-y-0.5 pr-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  Habilitar enlace de colaboración
                </label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Cualquier compañero con el enlace podrá acceder.
                </p>
              </div>
              <Switch
                checked={isShared}
                onCheckedChange={handleToggleShare}
                disabled={saving}
              />
            </div>
          ) : (
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Solo el creador puede activar o revocar el enlace de este apunte.</span>
            </div>
          )}

          {/* Sharing Options when enabled */}
          {isShared && (
            <div className="space-y-3.5 animate-in fade-in-50 duration-150">
              {/* Permission Selector */}
              {isOwner && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Permiso de acceso:
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-100/70 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => handleChangePermission("view")}
                      disabled={saving}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                        permission === "view"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Solo Lectura
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangePermission("edit")}
                      disabled={saving}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                        permission === "edit"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edición colaborativa
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {permission === "edit"
                      ? "⚡ Los invitados con cuenta en TABE podrán escribir y editar en tiempo real."
                      : "👁️ Los invitados solo podrán leer y explorar el apunte sin modificarlo."}
                  </p>
                </div>
              )}

              {/* Link Input & Copy */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Enlace para compartir:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 h-9 px-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg select-all text-zinc-800 dark:text-zinc-200 truncate focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="h-9 px-3.5 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-2xs shrink-0 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copiado" : "Copiar"}</span>
                  </Button>
                </div>
              </div>

              {/* Revoke / Regenerate Token Button */}
              {isOwner && (
                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>¿Deseas invalidar el enlace anterior?</span>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={saving}
                    className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerar enlace
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Collaborators Section */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                Conectados en este apunte ({activeCollaborators.length})
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                En vivo
              </span>
            </div>

            {activeCollaborators.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic p-2.5 rounded-lg bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                No hay otros compañeros conectados a este apunte en este momento.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeCollaborators.map((c) => (
                  <div
                    key={c.user_id}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs"
                  >
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[9px] font-semibold shrink-0">
                        {(c.name || "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[120px] font-medium">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="px-5 h-8.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-xs font-medium shadow-2xs"
          >
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
