import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Users, Copy, Check, Swords, Bot, KeyRound, Send, ArrowLeft, ArrowRight, User, UserPlus } from "lucide-react";
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
    toast.success("Código copiado al portapapeles");
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
      <DialogContent className="bg-card text-foreground border border-border/80 shadow-2xl rounded-2xl max-w-lg p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center justify-between text-lg font-semibold tracking-tight">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-base">{gameTitle}</span>
                <span className="block text-xs font-normal text-muted-foreground">Configuración de partida</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* TAB 1: SELECCION DE MODO */}
        {tab === "select" && (
          <div className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground font-medium">
              Elige cómo deseas jugar esta partida:
            </p>

            <div className="space-y-2">
              {/* Partida Rápida */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectQuickMatch();
                }}
                className="w-full group p-3.5 bg-card/60 hover:bg-muted/60 border border-border/60 hover:border-border rounded-xl transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Partida rápida
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Emparejamiento inmediato 1 vs 1 o con bot de apoyo
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
                    Automático
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              {/* Crear Sala Privada */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="w-full group p-3.5 bg-card/60 hover:bg-muted/60 border border-border/60 hover:border-border rounded-xl transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Crear sala privada
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Genera un código privado para jugar con un compañero
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
                    Código
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              {/* Unirse con Código */}
              <button
                type="button"
                onClick={() => setTab("join_room")}
                className="w-full group p-3.5 bg-card/60 hover:bg-muted/60 border border-border/60 hover:border-border rounded-xl transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Unirse a una sala
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Ingresa el código compartido por tu amigo
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
                    Unirse
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              {/* Modo Práctica vs Bot */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectBotMatch();
                }}
                className="w-full group p-3.5 bg-card/60 hover:bg-muted/60 border border-border/60 hover:border-border rounded-xl transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      Modo práctica (vs IA)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Entrena tus conocimientos contra el bot de TABE
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
                    Individual
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SALA CREADA (CÓDIGO + RETAR AMIGOS) */}
        {tab === "create_room" && (
          <div className="space-y-5 pt-3">
            <div className="text-center space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Código de tu sala privada</span>
              <div className="p-3.5 bg-muted/40 border border-border/80 rounded-xl flex items-center justify-center gap-3">
                <span className="font-mono font-bold text-2xl tracking-widest text-foreground">
                  {generatedCode}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0 border-border/80 hover:bg-muted"
                  onClick={handleCopyCode}
                  title="Copiar código"
                >
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Comparte este código con tu compañero para que ingrese desde "Unirse a una sala".
              </p>
            </div>

            {/* Desafiar amigos directamente */}
            {friends.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Invitar a un amigo en línea:</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {friends.map((friendship) => {
                    const friend = friendship.friend;
                    const isInvited = invitedFriends.has(friend.user_id);
                    return (
                      <div
                        key={friend.user_id}
                        className="p-2.5 bg-muted/30 border border-border/60 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium truncate text-foreground">
                            {friend.nombre || friend.username || `#${friend.display_id}`}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={isInvited ? "outline" : "default"}
                          disabled={isInvited}
                          onClick={() => handleSendInvite(friend.user_id, friend.nombre || friend.username || "Amigo")}
                          className="h-7 text-xs px-2.5 font-medium shrink-0"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {isInvited ? "Enviado" : "Desafiar"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                className="flex-1 h-10 text-xs font-medium border-border/80"
                onClick={() => setTab("select")}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Volver
              </Button>
              <Button
                className="flex-1 h-10 text-xs font-medium"
                onClick={() => {
                  onClose();
                  onSelectQuickMatch();
                }}
              >
                Esperar o Iniciar
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: UNIRSE CON CÓDIGO */}
        {tab === "join_room" && (
          <div className="space-y-4 pt-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">
                Ingresa el código proporcionado por tu compañero
              </label>
              <Input
                placeholder="Ej: TAB-482"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="bg-muted/30 border border-border/80 rounded-xl h-12 font-mono font-bold text-xl text-center uppercase tracking-widest text-foreground focus-visible:ring-1"
              />
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                className="flex-1 h-10 text-xs font-medium border-border/80"
                onClick={() => setTab("select")}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Volver
              </Button>
              <Button
                disabled={loading || !inputCode.trim()}
                onClick={handleJoin}
                className="flex-1 h-10 text-xs font-medium"
              >
                {loading ? "Conectando..." : "Entrar a la sala"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
