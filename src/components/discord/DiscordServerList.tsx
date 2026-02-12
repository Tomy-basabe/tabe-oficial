import { useState } from "react";
import { Plus, Compass, Download, Trash2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiscordServer } from "@/hooks/useDiscord";
import { useAuth } from "@/contexts/AuthContext";

interface DiscordServerListProps {
  servers: DiscordServer[];
  currentServer: DiscordServer | null;
  onSelectServer: (server: DiscordServer | null) => void;
  onCreateServer: (name: string) => Promise<any>;
  onDeleteServer?: (serverId: string) => Promise<void>;
  onLeaveServer?: (serverId: string) => Promise<void>;
  onJoinByCode?: (code: string) => Promise<boolean>;
  onCreateInvite?: () => Promise<string | null>;
  hasCurrentServer?: boolean;
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
  hasCurrentServer
}: DiscordServerListProps) {
  const { user } = useAuth();
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [serverName, setServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreateServer = async () => {
    if (!serverName.trim()) return;
    setCreating(true);
    await onCreateServer(serverName.trim());
    setServerName("");
    setShowCreateServer(false);
    setCreating(false);
  };

  const handleJoinServer = async () => {
    if (!inviteCode.trim() || !onJoinByCode) return;
    setJoining(true);
    const success = await onJoinByCode(inviteCode.trim());
    if (success) {
      setInviteCode("");
      setShowJoinServer(false);
    }
    setJoining(false);
  };
  return (
    <div className="w-[72px] bg-background/95 backdrop-blur border-r border-border py-3 flex flex-col items-center gap-2 overflow-y-auto discord-scrollbar shrink-0 z-50">
      {/* Home Button (Direct Messages) */}
      <div className="relative group mb-1">
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[4px] bg-primary rounded-r-lg transition-all duration-200",
          !currentServer ? "h-10" : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
        )} />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSelectServer(null)}
              className={cn(
                "w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mx-3 overflow-hidden shadow-lg shadow-black/20",
                !currentServer
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <img src="/discord-icon.svg" alt="Discord" className="w-7 h-7" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.2 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.53.31-1.07.57-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.02c1.68-.53 3.4-1.33 5.2-2.65c.02-.01.03-.03.03-.05c.44-4.52-.6-9.67-4.43-14.12c-.01-.01-.02-.01-.03-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.85 2.12-1.89 2.12z"/></svg>';
              }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Mensajes directos
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
              {onCreateInvite && (
                <ContextMenuItem
                  className="cursor-pointer"
                  onClick={async () => {
                    // Need to select server first to create invite for it
                    onSelectServer(server);
                    const code = await onCreateInvite();
                    if (code) {
                      navigator.clipboard?.writeText(code);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Crear Invitación
                </ContextMenuItem>
              )}
              {user?.id === server.owner_id && onDeleteServer ? (
                <ContextMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer group"
                  onClick={() => onDeleteServer(server.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Servidor
                </ContextMenuItem>
              ) : (
                <ContextMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer group"
                  onClick={() => onLeaveServer?.(server.id)}
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

      {/* Add Server Button */}
      <div className="relative group mb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog open={showCreateServer} onOpenChange={setShowCreateServer}>
              <DialogTrigger asChild>
                <button className="w-12 h-12 rounded-[24px] bg-card hover:bg-success hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-success hover:text-white mx-3 border border-dashed border-muted-foreground/30 hover:border-transparent">
                  <Plus className="w-6 h-6" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-md p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2 text-center bg-muted/20">
                  <DialogTitle className="text-2xl font-bold text-primary font-orbitron">Personaliza tu servidor</DialogTitle>
                  <p className="text-muted-foreground text-sm mt-2 text-center px-4">
                    Dale una personalidad propia a tu nuevo servidor con un nombre y un icono.
                  </p>
                </DialogHeader>

                <div className="p-6 space-y-4 bg-muted/10">
                  <div className="flex justify-center mb-2">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center flex-col gap-1 cursor-pointer hover:bg-muted/20 transition-colors group">
                      <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center -mt-1 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                        <Plus className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">UPLOAD</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">
                      Nombre del servidor
                    </label>
                    <Input
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      placeholder="Mi servidor genial"
                      className="bg-background border-input text-foreground h-10 focus-visible:ring-primary"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateServer();
                      }}
                    />
                  </div>
                </div>

                <div className="bg-muted/30 p-4 flex justify-between items-center border-t border-border">
                  <button
                    onClick={() => setShowCreateServer(false)}
                    className="text-sm text-foreground hover:underline px-4 hover:text-primary transition-colors"
                  >
                    Atrás
                  </button>
                  <Button
                    onClick={handleCreateServer}
                    disabled={!serverName.trim() || creating}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-lg shadow-primary/20"
                  >
                    Crear
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Añadir un servidor
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Join Server Button */}
      <div className="relative group mb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog open={showJoinServer} onOpenChange={setShowJoinServer}>
              <DialogTrigger asChild>
                <button className="w-12 h-12 rounded-[24px] bg-card hover:bg-primary hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-primary hover:text-primary-foreground mx-3 shadow-sm">
                  <Compass className="w-6 h-6" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-md p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-2 text-center bg-muted/20">
                  <DialogTitle className="text-2xl font-bold text-primary font-orbitron">Unirse a un Servidor</DialogTitle>
                  <p className="text-muted-foreground text-sm mt-2 text-center px-4">
                    Ingresá el código de invitación que te compartieron para unirte a un servidor.
                  </p>
                </DialogHeader>
                <div className="p-6 space-y-4 bg-muted/10">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">
                      Código de invitación
                    </label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Ej: ABC12345"
                      className="bg-background border-input text-foreground h-10 focus-visible:ring-primary text-center text-lg tracking-widest font-mono uppercase"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleJoinServer();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="bg-muted/30 p-4 flex justify-between items-center border-t border-border">
                  <button
                    onClick={() => setShowJoinServer(false)}
                    className="text-sm text-foreground hover:underline px-4 hover:text-primary transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button
                    onClick={handleJoinServer}
                    disabled={!inviteCode.trim() || joining}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-lg shadow-primary/20"
                  >
                    {joining ? "Uniéndose..." : "Unirse"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Unirse a un servidor
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Download Button */}
      <div className="relative group">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-12 h-12 rounded-[24px] bg-card hover:bg-success hover:rounded-[16px] transition-all duration-200 flex items-center justify-center text-success hover:text-white mx-3 shadow-sm">
              <Download className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground font-semibold border-border">
            Descargar aplicaciones
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
