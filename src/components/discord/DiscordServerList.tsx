import { useState } from "react";
import { Plus, Compass, Trash2, LogOut, Home, Server, KeyRound, Sparkles } from "lucide-react";
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
}: DiscordServerListProps) {
  const { user } = useAuth();
  const [internalOpenModal, setInternalOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

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
    <div className="md:w-[72px] w-full bg-background/95 backdrop-blur border-r md:border-r border-border md:py-3 py-3 flex md:flex-col flex-row items-center md:gap-2 gap-3 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden discord-scrollbar shrink-0 z-50 px-3 md:px-0">
      {/* Botón de Retorno al Dashboard principal */}
      {onGoBack && (
        <div className="relative group mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onGoBack}
                className="w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mx-3 bg-secondary text-foreground hover:bg-destructive hover:text-white border border-border/50 shadow-lg shadow-black/20"
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
                "w-14 h-14 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mx-2 overflow-hidden shadow-xl shadow-black/25 p-1",
                !currentServer
                  ? "bg-primary/20 border-2 border-primary text-primary scale-105"
                  : "bg-card text-muted-foreground hover:bg-primary/20 hover:text-primary"
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

      <div className="w-8 h-[2px] bg-border/50 rounded-lg mx-auto" />

      {/* Server List */}
      <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto discord-scrollbar py-2">
        {servers.map((server) => (
          <ContextMenu key={server.id}>
            <ContextMenuTrigger>
              <div className="relative group w-full flex justify-center">
                <div className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-[4px] bg-primary rounded-r-lg transition-all duration-200",
                  currentServer?.id === server.id ? "h-10" : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
                )} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectServer(server)}
                      className={cn(
                        "w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 overflow-hidden shadow-lg shadow-black/20",
                        currentServer?.id === server.id ? "rounded-[16px] ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      )}
                    >
                      <Avatar className={cn(
                        "w-full h-full transition-colors",
                        currentServer?.id === server.id ? "bg-primary" : "bg-card group-hover:bg-primary"
                      )}>
                        <AvatarImage src={server.icon_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-transparent text-sm font-medium text-foreground group-hover:text-primary-foreground">
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
                    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el servidor "${server.name}" y todos sus canales y mensajes? Esta acción no se puede deshacer.`)) {
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
                    if (window.confirm(`¿Deseas salir del servidor "${server.name}"?`)) {
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

      <div className="w-8 h-[2px] bg-border/50 rounded-lg mx-auto mb-2" />

      {/* Botón 1: Añadir o Crear Servidor (+) */}
      <div className="relative group mb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenCreate}
              className="w-12 h-12 rounded-[24px] bg-card hover:bg-primary hover:text-primary-foreground hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-primary mx-3 border border-dashed border-primary/40 hover:border-transparent shadow-sm"
              aria-label="Crear o unirse a un servidor"
            >
              <Plus className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Crear o unirse a un servidor
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Botón 2: Brújula - Explorar / Unirse con Código */}
      <div className="relative group mb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenJoin}
              className="w-12 h-12 rounded-[24px] bg-card hover:bg-primary hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-muted-foreground hover:text-primary-foreground mx-3 shadow-sm"
              aria-label="Unirse a un servidor con código"
            >
              <Compass className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Unirse con código de invitación
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Modal Unificado: Crear Servidor | Unirse con Código */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-4 text-center bg-muted/20 border-b border-border/50">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Comunidad Tabetalk
            </DialogTitle>
            <p className="text-muted-foreground text-xs mt-1">
              Crea tu propio espacio de estudio o únete al de tus compañeros con un código.
            </p>
          </DialogHeader>

          <div className="p-6">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "create" | "join")} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-6 bg-muted/60 p-1">
                <TabsTrigger value="create" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Server className="w-3.5 h-3.5" />
                  Crear Servidor
                </TabsTrigger>
                <TabsTrigger value="join" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <KeyRound className="w-3.5 h-3.5" />
                  Unirse con Código
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Crear Servidor */}
              <TabsContent value="create" className="space-y-4 m-0 focus-visible:outline-none">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Nombre del servidor <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    placeholder="Ej. Grupo de Estudio Algoritmos"
                    className="bg-background border-input text-foreground h-10 focus-visible:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateServer();
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    URL de Icono o Avatar (opcional)
                  </label>
                  <Input
                    value={serverIcon}
                    onChange={(e) => setServerIcon(e.target.value)}
                    placeholder="https://ejemplo.com/icono.png"
                    className="bg-background border-input text-foreground h-10 focus-visible:ring-primary text-xs font-mono"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateServer}
                    disabled={!serverName.trim() || creating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20"
                  >
                    {creating ? "Creando..." : "Crear Servidor"}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: Unirse con Código */}
              <TabsContent value="join" className="space-y-4 m-0 focus-visible:outline-none">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Código de Invitación <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Ej. TABE-A9F3"
                    className="bg-background border-input text-foreground h-11 focus-visible:ring-primary text-center text-base tracking-widest font-mono uppercase font-bold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleJoinServer();
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    Pídele el código o enlace al administrador del servidor.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleJoinServer}
                    disabled={!inviteCode.trim() || joining}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20"
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
