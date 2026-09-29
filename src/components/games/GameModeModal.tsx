import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Users, Copy, Check, Swords, Bot, KeyRound, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFriends } from "@/hooks/useFriends";

interface GameModeModalProps {
  open: boolean;
  onClose: () => void;
  gameTitle: string;
  gameType: string;
  onSelectQuickMatch: () => void;
  onSelectBotMatch: () => void;
  onCreateRoom: () => Promise<string | null>;
  onJoinRoom: (code: string) => Promise<boolean>;
  onInviteFriend: (friendUserId: string, code: string) => Promise<void>;
}

export function GameModeModal({
  open,
  onClose,
  gameTitle,
  gameType,
  onSelectQuickMatch,
  onSelectBotMatch,
  onCreateRoom,
  onJoinRoom,
  onInviteFriend,
}: GameModeModalProps) {
  const [tab, setTab] = useState<"select" | "create_room" | "join_room">("select");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

  const { friends } = useFriends();

  const handleCreate = async () => {
    setLoading(true);
    const code = await onCreateRoom();
    setLoading(false);
    if (code) {
      setGeneratedCode(code);
      setTab("create_room");
    }
  };

  const handleJoin = async () => {
    if (!inputCode.trim()) {
      toast.error("Ingresa un código de sala");
      return;
    }
    setLoading(true);
    const success = await onJoinRoom(inputCode.trim().toUpperCase());
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("¡Código copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async (friendId: string, friendName: string) => {
    if (!generatedCode) return;
    setInvitedFriends(prev => new Set(prev).add(friendId));
    await onInviteFriend(friendId, generatedCode);
    toast.success(`Desafío enviado a ${friendName}`);
  };

  const resetState = () => {
    setTab("select");
    setGeneratedCode(null);
    setInputCode("");
    setCopied(false);
    setInvitedFriends(new Set());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          resetState();
          onClose();
        }
      }}
    >
      <DialogContent className="bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl max-w-lg p-6">
        <DialogHeader>
          <DialogTitle className="font-black uppercase text-2xl flex items-center justify-between border-b-4 border-foreground pb-4">
            <div className="flex items-center gap-2">
              <Swords className="w-7 h-7 text-[#FFD700]" strokeWidth={2.5} />
              <span>{gameTitle}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* TAB 1: SELECCION DE MODO */}
        {tab === "select" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs font-black uppercase text-muted-foreground">
              ¿Cómo quieres jugar hoy?
            </p>

            {/* Partida Rápida */}
            <div
              onClick={() => {
                onClose();
                onSelectQuickMatch();
              }}
              className="group p-4 bg-muted/40 border-4 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#00E5FF] border-2 border-foreground flex items-center justify-center text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] group-hover:rotate-6 transition-transform">
                  <Zap className="w-6 h-6" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-black uppercase text-base text-foreground">Partida Rápida</h4>
                  <p className="text-xs font-bold text-muted-foreground">Busca un rival 1v1 o juega contra Bot TABE</p>
                </div>
              </div>
              <span className="font-black text-xs uppercase bg-[#BFFF00] text-black px-2 py-1 rounded border border-foreground">
                Auto
              </span>
            </div>

            {/* Crear Sala Privada */}
            <div
              onClick={handleCreate}
              className="group p-4 bg-muted/40 border-4 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#BFFF00] border-2 border-foreground flex items-center justify-center text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] group-hover:rotate-6 transition-transform">
                  <Users className="w-6 h-6" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-black uppercase text-base text-foreground">Crear Sala</h4>
                  <p className="text-xs font-bold text-muted-foreground">Crea un código privado y reta a un amigo</p>
                </div>
              </div>
              <span className="font-black text-xs uppercase bg-foreground text-background px-2 py-1 rounded border border-foreground">
                Código
              </span>
            </div>

            {/* Unirse con Código */}
            <div
              onClick={() => setTab("join_room")}
              className="group p-4 bg-muted/40 border-4 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#FFD700] border-2 border-foreground flex items-center justify-center text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] group-hover:rotate-6 transition-transform">
                  <KeyRound className="w-6 h-6" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-black uppercase text-base text-foreground">Unirse a Sala</h4>
                  <p className="text-xs font-bold text-muted-foreground">Ingresa con el código que te compartió tu rival</p>
                </div>
              </div>
              <span className="font-black text-xs uppercase bg-[#FFD700] text-black px-2 py-1 rounded border border-foreground">
                Entrar
              </span>
            </div>

            {/* Modo Práctica vs Bot */}
            <div
              onClick={() => {
                onClose();
                onSelectBotMatch();
              }}
              className="group p-4 bg-muted/40 border-4 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#C688EB] border-2 border-foreground flex items-center justify-center text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] group-hover:rotate-6 transition-transform">
                  <Bot className="w-6 h-6" strokeWidth={3} />
                </div>
                <div>
                  <h4 className="font-black uppercase text-base text-foreground">Práctica Solitario</h4>
                  <p className="text-xs font-bold text-muted-foreground">Juega al instante contra el Bot de TABE</p>
                </div>
              </div>
              <span className="font-black text-xs uppercase bg-[#C688EB] text-black px-2 py-1 rounded border border-foreground">
                1P
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: SALA CREADA (CÓDIGO + RETAR AMIGOS) */}
        {tab === "create_room" && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-2">
              <span className="text-xs font-black uppercase text-muted-foreground">Código de tu Sala Privada</span>
              <div className="p-4 bg-background border-4 border-foreground rounded-xl flex items-center justify-center gap-4 shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                <span className="font-black text-3xl tracking-widest text-foreground font-mono">
                  {generatedCode}
                </span>
                <Button
                  size="icon"
                  className="bg-[#BFFF00] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-[#a6e600]"
                  onClick={handleCopyCode}
                  title="Copiar código"
                >
                  {copied ? <Check className="w-5 h-5" strokeWidth={3} /> : <Copy className="w-5 h-5" strokeWidth={2.5} />}
                </Button>
              </div>
              <p className="text-xs font-bold text-muted-foreground">
                Pásale este código a tu amigo para que entre desde "Unirse a Sala"
              </p>
            </div>

            {/* Desafiar amigos directamente */}
            {friends.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs font-black uppercase text-foreground">O desafía a un amigo ahora:</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {friends.map((friendship) => {
                    const friend = friendship.friend;
                    const isInvited = invitedFriends.has(friend.user_id);
                    return (
                      <div
                        key={friend.user_id}
                        className="p-2.5 bg-muted/50 border-2 border-foreground rounded-xl flex items-center justify-between text-sm"
                      >
                        <span className="font-black uppercase truncate text-foreground">
                          {friend.nombre || friend.username || `#${friend.display_id}`}
                        </span>
                        <Button
                          size="sm"
                          disabled={isInvited}
                          onClick={() => handleSendInvite(friend.user_id, friend.nombre || friend.username || "Amigo")}
                          className={cn(
                            "font-black text-xs uppercase border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] h-8",
                            isInvited ? "bg-muted text-muted-foreground" : "bg-[#00E5FF] text-black hover:bg-[#00cce6]"
                          )}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          {isInvited ? "Enviado" : "Desafiar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t-2 border-foreground/20">
              <Button
                variant="outline"
                className="flex-1 font-black uppercase border-2 border-foreground"
                onClick={() => setTab("select")}
              >
                Volver
              </Button>
              <Button
                className="flex-1 bg-[#BFFF00] text-black font-black uppercase border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-[#a6e600]"
                onClick={() => {
                  onClose();
                  onSelectQuickMatch();
                }}
              >
                Iniciar Partida
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: UNIRSE CON CÓDIGO */}
        {tab === "join_room" && (
          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-muted-foreground">
                Ingresa el código que te dio tu amigo
              </label>
              <Input
                placeholder="Ej: TAB-482"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="bg-background border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl h-14 font-mono font-black text-2xl text-center uppercase tracking-widest text-foreground focus-visible:ring-0"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 font-black uppercase border-2 border-foreground h-12"
                onClick={() => setTab("select")}
              >
                Volver
              </Button>
              <Button
                disabled={loading || !inputCode.trim()}
                onClick={handleJoin}
                className="flex-1 bg-[#00E5FF] text-black font-black uppercase border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-[#00cce6] h-12"
              >
                {loading ? "Entrando..." : "Entrar a Sala"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
