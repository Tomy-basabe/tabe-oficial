import { useState, useEffect } from "react";
import { Plus, Compass, Trash2, LogOut, Home, Server, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiscordServer } from "@/hooks/useDiscord";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmModalContext";

interface DiscordServerListProps {
  servers: DiscordServer[];
  currentServer: DiscordServer | null;
  onSelectServer: (server: DiscordServer | null) => void;
  onCreateServer: (name: string, iconUrl?: string) => Promise<any>;
  onDeleteServer?: (serverId: string) => Promise<void>;
  onLeaveServer?: (serverId: string) => Promise<void>;
  onJoinByCode?: (code: string) => Promise<boolean>;
  onCreateInvite?: () => Promise<string | null>;
  hasCurrentServer?: boolean;
  onGoBack?: () => void;
  openModal?: boolean;
  onOpenModalChange?: (open: boolean) => void;
  defaultModalTab?: "create" | "join";
  prefillInviteCode?: string;
}

export function DiscordServerList({
  servers,
  currentServer,
  onSelectServer,
  onCreateServer,
  onDeleteServer,
  onLeaveServer,
  onJoinByCode,
  onCreateInvite,
  hasCurrentServer,
  onGoBack,
  openModal,
  onOpenModalChange,
  defaultModalTab,
  prefillInviteCode,
}: DiscordServerListProps) {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const [internalOpenModal, setInternalOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "join">(defaultModalTab || "create");
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("");
  const [inviteCode, setInviteCode] = useState(prefillInviteCode || "");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Sincronizar tab por defecto y código pre-rellenado si cambian
  useEffect(() => {
    if (defaultModalTab) {
      setActiveTab(defaultModalTab);
    }
  }, [defaultModalTab]);

  useEffect(() => {
    if (prefillInviteCode) {
      setInviteCode(prefillInviteCode);
    }
  }, [prefillInviteCode]);

  const isModalOpen = openModal !== undefined ? openModal : internalOpenModal;
  const setModalOpen = (open: boolean) => {
    if (onOpenModalChange) {
      onOpenModalChange(open);
    } else {
      setInternalOpenModal(open);
    }
  };

  const handleOpenCreate = () => {
    setActiveTab("create");
    setModalOpen(true);
  };

  const handleOpenJoin = () => {
    setActiveTab("join");
    setModalOpen(true);
  };

  const handleCreateServer = async () => {
    if (!serverName.trim()) return;
    setCreating(true);
    await onCreateServer(serverName.trim(), serverIcon.trim() || undefined);
    setServerName("");
    setServerIcon("");
    setModalOpen(false);
    setCreating(false);
  };

  const handleJoinServer = async () => {
    if (!inviteCode.trim() || !onJoinByCode) return;
    setJoining(true);
    const success = await onJoinByCode(inviteCode.trim());
    if (success) {
      setInviteCode("");
      setModalOpen(false);
    }
    setJoining(false);
  };

  return (
    <div className="md:w-[78px] w-full bg-background/95 dark:bg-[#080b12]/95 backdrop-blur-xl border-b md:border-b-0 md:border-r border-border dark:border-white/10 md:py-4 py-2 flex md:flex-col flex-row items-center md:gap-2 gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden discord-scrollbar shrink-0 z-50 px-2 sm:px-3 md:px-0">
      {/* Botón de Retorno al Dashboard principal */}
      {onGoBack && (
        <div className="relative group mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onGoBack}
                className="w-12 h-12 rounded-2xl hover:bg-rose-500/20 transition-all duration-200 flex items-center justify-center mx-3 bg-white/5 text-slate-300 hover:text-rose-300 border border-white/10 shadow-lg shadow-black/20"
                aria-label="Volver al Dashboard"
              >
                <Home className="w-5 h-5 stroke-[2.5]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
              Volver al Dashboard
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Logo Oficial Tabetalk / Inicio */}
      <div className="relative group mb-1.5">
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[4px] bg-primary rounded-r-lg transition-all duration-200",
          !currentServer ? "h-10" : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
        )} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSelectServer(null)}
              className={cn(
                  "w-14 h-14 rounded-2xl group-hover:rounded-xl transition-all duration-200 flex items-center justify-center mx-2 overflow-hidden shadow-xl shadow-black/25 p-1",
                !currentServer
                  ? "bg-cyan-300/10 border border-cyan-300/50 text-cyan-300 scale-105"
                  : "bg-white/5 text-slate-400 hover:bg-cyan-300/10 hover:text-cyan-300"
              )}
            >
              <img 
                src="/tabe-talk.png" 
                alt="Tabetalk" 
                className="w-10 h-10 object-contain shrink-0 transition-transform duration-200 group-hover:scale-110" 
                onError={(e) => { e.currentTarget.src = "/logo.png"; }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Tabetalk (Inicio)
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Separador adaptativo: vertical en mobile horizontal, horizontal en desktop vertical */}
      <div className="w-[2px] h-7 md:w-8 md:h-[2px] bg-border/60 rounded-full mx-1 md:mx-auto shrink-0" />

      {/* Server List */}
      <div className="flex md:flex-col flex-row items-center gap-2 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto discord-scrollbar py-1 md:py-2 shrink-0 md:shrink md:w-full">
        {servers.map((server) => (
          <ContextMenu key={server.id}>
            <ContextMenuTrigger>
              <div className="relative group flex justify-center shrink-0">
                <div className={cn(
                  "hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[4px] bg-primary rounded-r-lg transition-all duration-200",
                  currentServer?.id === server.id ? "h-10" : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
                )} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectServer(server)}
                      className={cn(
                        "w-11 h-11 md:w-12 md:h-12 rounded-2xl group-hover:rounded-xl transition-all duration-200 overflow-hidden shadow-md shadow-black/20 shrink-0",
                        currentServer?.id === server.id ? "ring-2 ring-cyan-300 ring-offset-2 ring-offset-[#080b12] scale-105" : ""
                      )}
                    >
                      <Avatar className={cn(
                        "w-full h-full transition-colors",
                        currentServer?.id === server.id ? "bg-cyan-300" : "bg-white/5 group-hover:bg-cyan-300"
                      )}>
                        <AvatarImage src={server.icon_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-transparent text-xs md:text-sm font-bold text-slate-200 group-hover:text-slate-950">
                          {server.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
                    {server.name}
                  </TooltipContent>
                </Tooltip>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 bg-card border-border text-foreground">
              {user?.id === server.owner_id && onDeleteServer ? (
                <ContextMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer group"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "¿Eliminar servidor permanentemente?",
                      description: `¿Estás seguro de que deseas eliminar permanentemente el servidor "${server.name}" y todos sus canales y mensajes? Esta acción no se puede deshacer.`,
                      confirmText: "Eliminar servidor",
                      cancelText: "Cancelar",
                      variant: "danger",
                    });
                    if (ok) {
                      await onDeleteServer(server.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Servidor
                </ContextMenuItem>
              ) : (
                <ContextMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer group"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "¿Salir del servidor?",
                      description: `¿Deseas salir del servidor "${server.name}"?`,
                      confirmText: "Salir",
                      cancelText: "Cancelar",
                      variant: "warning",
                    });
                    if (ok) {
                      await onLeaveServer?.(server.id);
                    }
                  }}
                  disabled={!onLeaveServer}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Salir del Servidor
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      {/* Separador adaptativo */}
      <div className="w-[2px] h-7 md:w-8 md:h-[2px] bg-border/60 rounded-full mx-1 md:mx-auto shrink-0 md:mb-2" />

      {/* Botón 1: Añadir o Crear Servidor (+) */}
      <div className="relative group shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenCreate}
              className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white/5 hover:bg-cyan-300 hover:text-slate-950 transition-all duration-200 flex items-center justify-center text-cyan-300 border border-dashed border-cyan-300/40 hover:border-cyan-300 shadow-sm shrink-0 active:scale-95"
              aria-label="Crear servidor"
            >
              <Plus className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Crear un servidor
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Botón 2: Brújula - Explorar / Unirse con Código */}
      <div className="relative group shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenJoin}
              className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-white/5 hover:bg-indigo-300 hover:text-slate-950 transition-all duration-200 flex items-center justify-center text-slate-400 hover:border-indigo-300 shadow-sm shrink-0 active:scale-95"
              aria-label="Unirse a un servidor con código"
            >
              <Compass className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Unirse con código de invitación
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Modal Unificado: Crear Servidor | Unirse con Código */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card dark:bg-[#111827] border border-border dark:border-white/10 text-foreground dark:text-slate-100 w-[94vw] max-w-md max-h-[88vh] overflow-y-auto rounded-2xl p-0 gap-0 shadow-2xl">
          <DialogHeader className="p-5 sm:p-6 pb-4 text-center bg-[#FFE600]/10 border-b-2 border-black">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mx-auto mb-2 text-black shadow-[3px_3px_0px_#000]">
              <Compass className="w-6 h-6 stroke-[2.5]" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-black uppercase text-foreground tracking-wide">
              Comunidad Tabetalk
            </DialogTitle>
            <p className="text-muted-foreground text-xs font-medium mt-1">
              Crea tu espacio de estudio o únete al de tus compañeros en segundos.
            </p>
          </DialogHeader>

          <div className="p-4 sm:p-6">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "create" | "join")} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-5 bg-muted/60 p-1 border-2 border-black rounded-xl">
                <TabsTrigger 
                  value="create" 
                  className="text-xs font-black uppercase gap-1.5 data-[state=active]:bg-[#FFE600] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg transition-all py-2"
                >
                  <Server className="w-3.5 h-3.5 stroke-[2.5]" />
                  Crear Servidor
                </TabsTrigger>
                <TabsTrigger 
                  value="join" 
                  className="text-xs font-black uppercase gap-1.5 data-[state=active]:bg-[#00E5FF] data-[state=active]:text-black data-[state=active]:shadow-[2px_2px_0px_#000] data-[state=active]:border-2 data-[state=active]:border-black rounded-lg transition-all py-2"
                >
                  <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
                  Unirse con Código
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Crear Servidor */}
              <TabsContent value="create" className="space-y-4 m-0 focus-visible:outline-none">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-1">
                    Nombre del servidor <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="Ej. Grupo de Estudio Algoritmos"
                    className="bg-background border-2 border-black text-foreground h-11 focus-visible:ring-primary font-bold shadow-[2px_2px_0px_#000]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateServer();
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground uppercase tracking-wide">
                    URL de Icono o Avatar (opcional)
                  </label>
                  <Input
                    value={serverIcon}
                    onChange={(e) => setServerIcon(e.target.value)}
                    placeholder="https://ejemplo.com/icono.png"
                    className="bg-background border-2 border-black text-foreground h-11 focus-visible:ring-primary text-xs font-mono shadow-[2px_2px_0px_#000]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateServer}
                    disabled={!serverName.trim() || creating}
                    className="bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_#000] transition-all h-10 px-5"
                  >
                    {creating ? "Creando..." : "Crear Servidor"}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: Unirse con Código */}
              <TabsContent value="join" className="space-y-4 m-0 focus-visible:outline-none">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-1">
                    Código de Invitación o Enlace <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Ej. TABE-A9F3 o pega el link"
                    className="bg-background border-2 border-black text-foreground h-12 focus-visible:ring-primary text-center text-sm sm:text-base tracking-wider font-mono uppercase font-black shadow-[3px_3px_0px_#000]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleJoinServer();
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground text-center font-medium mt-1">
                    Pega el código corto o el link que te compartió tu compañero.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleJoinServer}
                    disabled={!inviteCode.trim() || joining}
                    className="bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_#000] transition-all h-10 px-5"
                  >
                    {joining ? "Uniéndose..." : "Unirse al Servidor"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
