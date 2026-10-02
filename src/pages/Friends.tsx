import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  UserPlus,
  Trophy,
  Clock,
  Flame,
  Zap,
  Search,
  Copy,
  Check,
  Bell,
  BellOff,
  UserX,
  Crown,
  Swords,
  MessageSquare,
  Send,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useGameRoom } from "@/hooks/useGameRoom";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendsSocial } from "@/contexts/FriendsSocialContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const QUICK_MESSAGES = [
  "¡Vamos a meterle una sesión de Pomodoro! 🍅",
  "¿Jugamos un desafío rápido? ⚔️",
  "¡Qué buena racha llevás esta semana! 🔥",
  "¿Repasamos juntos para el parcial? 📚",
];

export default function Friends() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    friends,
    pendingRequests,
    sentRequests,
    friendStats,
    myProfile,
    loading,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    updateUsername,
  } = useFriends({ enableRealtime: true });

  const {
    isUserOnline,
    messagesByFriend,
    unreadByFriend,
    totalUnread,
    typingByFriend,
    notificationsEnabled,
    toggleNotifications,
    activeChatFriendId,
    setActiveChatFriendId,
    sendMessage,
    sendTyping,
    markConversationRead,
  } = useFriendsSocial();

  const navigate = useNavigate();
  const { createRoom, sendFriendChallenge } = useGameRoom();
  const [mainTab, setMainTab] = useState<string>("leaderboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendIdentifier, setFriendIdentifier] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [leaderboardType, setLeaderboardType] = useState<"xp" | "pomodoro" | "study" | "streak">("xp");
  const [challengeTarget, setChallengeTarget] = useState<any | null>(null);
  const [challenging, setChallenging] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Abrir chat si viene por parámetro ?chat=userId (ej. desde notificación toast)
  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam) {
      setActiveChatFriendId(chatParam);
      setMainTab("messages");
      markConversationRead(chatParam);
      searchParams.delete("chat");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setActiveChatFriendId, markConversationRead]);

  // Seleccionar primer amigo por defecto al entrar a la pestaña de mensajes si no hay ninguno activo
  useEffect(() => {
    if (mainTab === "messages" && !activeChatFriendId && friends.length > 0) {
      const firstId = friends[0].friend.user_id;
      setActiveChatFriendId(firstId);
      markConversationRead(firstId);
    }
  }, [mainTab, activeChatFriendId, friends, setActiveChatFriendId, markConversationRead]);

  // Marcar como leído y hacer scroll al fondo cuando cambia el chat activo o llegan mensajes
  const currentChatMessages = activeChatFriendId ? messagesByFriend[activeChatFriendId] || [] : [];

  useEffect(() => {
    if (mainTab === "messages" && activeChatFriendId) {
      markConversationRead(activeChatFriendId);
    }
  }, [mainTab, activeChatFriendId, currentChatMessages.length, markConversationRead]);

  useEffect(() => {
    if (mainTab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentChatMessages.length, activeChatFriendId, mainTab]);

  // Limpiar chat activo al desmontar la página para que vuelvan a sonar notificaciones fuera de /amigos
  useEffect(() => {
    return () => {
      setActiveChatFriendId(null);
    };
  }, [setActiveChatFriendId]);

  const openChatWithFriend = (friendUserId: string) => {
    setActiveChatFriendId(friendUserId);
    markConversationRead(friendUserId);
    setMainTab("messages");
  };

  const activeChatFriend =
    friends.find(f => f.friend.user_id === activeChatFriendId)?.friend || null;

  const handleSendChatMessage = async (customText?: string) => {
    if (!activeChatFriend) return;
    const textToSend = customText !== undefined ? customText : messageInput;
    if (!textToSend.trim()) return;

    const friendDisplayName =
      activeChatFriend.nombre ||
      activeChatFriend.username ||
      `Usuario #${activeChatFriend.display_id}`;

    if (customText === undefined) {
      setMessageInput("");
    }
    await sendMessage(activeChatFriend.user_id, friendDisplayName, textToSend);
  };

  const handleLaunchChallenge = async (gameType: string) => {
    if (!challengeTarget) return;
    setChallenging(true);
    const { code, error } = await createRoom(gameType);
    if (code) {
      await sendFriendChallenge(challengeTarget.user_id, gameType, code);
      toast.success(`Desafío enviado a ${challengeTarget.nombre || challengeTarget.username}`);
      setChallengeTarget(null);
      setChallenging(false);
      navigate(`/juegos/${gameType}?room=${code}&isHost=true`);
    } else {
      setChallenging(false);
      toast.error(error || "No se pudo crear la sala");
    }
  };

  if (loading && friends.length === 0 && friendStats.length === 0 && !myProfile) {
    return <LoadingScreen message="Cargando Amigos..." submessage="Buscando compañeros de estudio..." />;
  }

  const handleSendRequest = async () => {
    if (!friendIdentifier.trim()) return;
    setSendingRequest(true);
    const result = await sendFriendRequest(friendIdentifier.trim());
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("¡Solicitud enviada!");
      setFriendIdentifier("");
      setAddFriendOpen(false);
    }
    setSendingRequest(false);
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    const result = await updateUsername(newUsername.trim());
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("¡Username actualizado!");
      setEditingUsername(false);
      setNewUsername("");
    }
  };

  const copyId = () => {
    if (myProfile?.display_id) {
      navigator.clipboard.writeText(myProfile.display_id.toString());
      setCopied(true);
      toast.success("ID copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getSortedStats = () => {
    return [...friendStats].sort((a, b) => {
      switch (leaderboardType) {
        case "xp":
          return b.weekly_xp - a.weekly_xp;
        case "pomodoro":
          return b.weekly_pomodoro_hours - a.weekly_pomodoro_hours;
        case "study":
          return b.weekly_study_hours - a.weekly_study_hours;
        case "streak":
          return b.current_streak - a.current_streak;
        default:
          return 0;
      }
    });
  };

  const getStatValue = (stat: typeof friendStats[0]) => {
    switch (leaderboardType) {
      case "xp":
        return `${stat.weekly_xp.toLocaleString()} XP`;
      case "pomodoro":
        return `${stat.weekly_pomodoro_hours.toFixed(1)}h`;
      case "study":
        return `${stat.weekly_study_hours.toFixed(1)}h`;
      case "streak":
        return `${stat.current_streak} días`;
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredFriends = friends.filter(friendship => {
    if (!normalizedSearchQuery) return true;

    const profile = friendship.friend;
    return Boolean(
      profile.nombre?.toLowerCase().includes(normalizedSearchQuery) ||
        profile.username?.toLowerCase().includes(normalizedSearchQuery) ||
        profile.display_id.toString().includes(normalizedSearchQuery)
    );
  });

  const onlineFriendsCount = friends.filter(f => isUserOnline(f.friend.user_id)).length;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black uppercase text-foreground flex items-center gap-3">
              <Users className="w-10 h-10 text-foreground" strokeWidth={3} />
              Amigos
            </h1>
            {/* Indicador global de amigos en línea */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF66] border border-black" />
              </span>
              <span className="text-xs font-black uppercase text-foreground">
                {onlineFriendsCount} en línea
              </span>
            </div>
          </div>
          <p className="text-muted-foreground font-bold uppercase mt-1">
            Compite, chatea en tiempo real y mide tu progreso
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Toggle de Notificaciones de Mensajes */}
          <Button
            type="button"
            variant="outline"
            onClick={toggleNotifications}
            className={cn(
              "h-14 px-4 border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all",
              notificationsEnabled
                ? "bg-[#FFE600] text-black hover:bg-yellow-400"
                : "bg-card text-muted-foreground hover:bg-muted"
            )}
            title={
              notificationsEnabled
                ? "Notificaciones de mensajes activadas (clic para silenciar)"
                : "Notificaciones de mensajes silenciadas (clic para activar)"
            }
          >
            {notificationsEnabled ? (
              <Bell className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <BellOff className="w-5 h-5 stroke-[2.5]" />
            )}
            <span className="hidden lg:inline">
              {notificationsEnabled ? "Avisos ON" : "Avisos OFF"}
            </span>
          </Button>

          {/* My ID Card */}
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] px-4 py-2 rounded-xl flex items-center justify-between gap-4 flex-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted-foreground leading-none">
                Mi ID
              </span>
              <span className="font-black text-lg text-foreground leading-tight">
                #{myProfile?.display_id || "..."}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-[#BFFF00] text-black border-2 border-foreground rounded-lg hover:bg-[#a6e600] hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
              onClick={copyId}
            >
              {copied ? (
                <Check className="w-5 h-5 text-black" strokeWidth={3} />
              ) : (
                <Copy className="w-5 h-5 text-black" strokeWidth={2.5} />
              )}
            </Button>
          </div>

          {/* Add Friend Button */}
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00E5FF] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:bg-[#00cce6] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all font-black uppercase h-14 px-6 rounded-xl text-lg w-full sm:w-auto">
                <UserPlus className="w-6 h-6 mr-2" strokeWidth={3} />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black uppercase text-2xl border-b-4 border-foreground pb-4 text-foreground">
                  Agregar Amigo
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">
                    Ingresa el ID o username de tu amigo
                  </label>
                  <Input
                    placeholder="Ej: 12345 o @username"
                    value={friendIdentifier}
                    onChange={e => setFriendIdentifier(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendRequest()}
                    className="bg-background border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-lg h-12 font-bold text-lg text-foreground focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  />
                </div>
                <Button
                  className="w-full bg-[#BFFF00] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:bg-[#a6e600] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_hsl(var(--foreground))] transition-all font-black uppercase h-14 rounded-xl text-lg"
                  onClick={handleSendRequest}
                  disabled={sendingRequest || !friendIdentifier.trim()}
                >
                  {sendingRequest ? "Enviando..." : "Enviar Solicitud"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Username Section */}
      <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-muted-foreground">Tu username</span>
            {myProfile?.username ? (
              <span className="font-black text-xl text-foreground">@{myProfile.username}</span>
            ) : (
              <span className="font-bold text-muted-foreground/60 italic">No configurado</span>
            )}
          </div>
          {editingUsername ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="nuevo_username"
                className="w-full sm:w-48 bg-background border-2 border-foreground rounded-lg font-bold text-foreground focus-visible:ring-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              />
              <div className="flex gap-2">
                <Button
                  className="bg-[#BFFF00] text-black border-2 border-foreground hover:bg-[#a6e600] font-black uppercase rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] flex-1"
                  onClick={handleUpdateUsername}
                >
                  Guardar
                </Button>
                <Button
                  className="bg-card text-foreground border-2 border-foreground hover:bg-muted font-black uppercase rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] flex-1"
                  onClick={() => setEditingUsername(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="bg-card text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all font-black uppercase rounded-lg w-full sm:w-auto"
              onClick={() => setEditingUsername(true)}
            >
              {myProfile?.username ? "Cambiar" : "Configurar"}
            </Button>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-[#FFD700] border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden text-black">
          <div className="bg-black text-[#FFD700] p-4 flex items-center gap-3">
            <Bell className="w-6 h-6" strokeWidth={3} />
            <h2 className="font-black uppercase text-xl">
              Solicitudes Pendientes ({pendingRequests.length})
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#C688EB] border-2 border-black flex items-center justify-center text-black font-black text-xl shadow-[2px_2px_0_0_#000]">
                    {request.friend.nombre?.[0]?.toUpperCase() ||
                      request.friend.username?.[0]?.toUpperCase() ||
                      "?"}
                  </div>
                  <div>
                    <p className="font-black text-lg text-foreground uppercase leading-tight">
                      {request.friend.nombre ||
                        request.friend.username ||
                        `Usuario #${request.friend.display_id}`}
                    </p>
                    <p className="font-bold text-muted-foreground text-sm">
                      #{request.friend.display_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-[#BFFF00] text-black border-2 border-foreground hover:bg-[#a6e600] font-black uppercase rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] flex-1 sm:flex-none"
                    onClick={() => respondToRequest(request.id, true)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    className="bg-[#FF5C5C] text-black border-2 border-foreground hover:bg-[#e64c4c] font-black uppercase rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] flex-1 sm:flex-none"
                    onClick={() => respondToRequest(request.id, false)}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1 border-4 border-foreground rounded-xl h-auto">
          <TabsTrigger
            value="leaderboard"
            className="data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase py-3 rounded-lg text-foreground transition-all text-xs sm:text-sm"
          >
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" strokeWidth={2.5} />
            Ranking
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase py-3 rounded-lg text-foreground transition-all text-xs sm:text-sm"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" strokeWidth={2.5} />
            Amigos ({friends.length})
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="relative data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase py-3 rounded-lg text-foreground transition-all text-xs sm:text-sm"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" strokeWidth={2.5} />
            Mensajes
            {totalUnread > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-black bg-[#FF2E93] text-white border border-black rounded-full shadow-[1px_1px_0_#000] animate-bounce">
                {totalUnread}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="flex flex-wrap gap-3 p-4 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl">
            {[
              { key: "xp", label: "XP Total", icon: Zap, color: "#FFD700" },
              { key: "pomodoro", label: "Horas Pomodoro", icon: Clock, color: "#00E5FF" },
              { key: "study", label: "Horas Estudio", icon: Clock, color: "#C688EB" },
              { key: "streak", label: "Racha", icon: Flame, color: "#FF5C5C" },
            ].map(({ key, label, icon: Icon, color }) => (
              <Button
                key={key}
                onClick={() => setLeaderboardType(key as typeof leaderboardType)}
                className={cn(
                  "font-black uppercase border-2 border-foreground rounded-lg transition-all h-10",
                  leaderboardType === key
                    ? "text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "bg-card text-foreground hover:bg-muted hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px]"
                )}
                style={leaderboardType === key ? { backgroundColor: color } : {}}
              >
                <Icon className="w-4 h-4 mr-2" strokeWidth={3} />
                {label}
              </Button>
            ))}
          </div>

          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-foreground font-bold uppercase">Cargando...</div>
            ) : friendStats.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" strokeWidth={2} />
                <p className="font-black uppercase text-xl">Agrega amigos para ver el ranking</p>
              </div>
            ) : (
              <div className="divide-y-4 divide-border">
                {getSortedStats().map((stat, index) => {
                  const isMe = stat.user_id === user?.id || (stat.user_id === "guest" && !user);
                  const position = index + 1;
                  const online = isUserOnline(stat.user_id);
                  const unread = unreadByFriend[stat.user_id] || 0;

                  return (
                    <div
                      key={stat.user_id}
                      className={cn(
                        "flex items-center justify-between p-4 sm:p-6 transition-colors",
                        isMe && "bg-[#BFFF00]/20",
                        position === 1 && !isMe && "bg-[#FFD700]/20",
                        position === 2 && !isMe && "bg-muted/40",
                        position === 3 && !isMe && "bg-[#FF9B71]/20"
                      )}
                    >
                      <div className="flex items-center gap-3 sm:gap-5">
                        {/* Position */}
                        <div
                          className={cn(
                            "w-10 h-10 border-2 border-foreground rounded-lg flex items-center justify-center font-black text-lg shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                            position === 1
                              ? "bg-[#FFD700] text-black"
                              : position === 2
                              ? "bg-muted text-foreground"
                              : position === 3
                              ? "bg-[#FF9B71] text-black"
                              : "bg-card text-foreground"
                          )}
                        >
                          {position === 1 ? <Crown className="w-5 h-5" strokeWidth={3} /> : position}
                        </div>

                        {/* Avatar con Luz de Estado En Línea */}
                        <div className="relative">
                          <div
                            className={cn(
                              "w-12 h-12 border-2 border-black rounded-lg flex items-center justify-center font-black text-xl shadow-[2px_2px_0_0_#000]",
                              isMe ? "bg-[#00E5FF] text-black" : "bg-[#C688EB] text-black"
                            )}
                          >
                            {stat.profile.nombre?.[0]?.toUpperCase() ||
                              stat.profile.username?.[0]?.toUpperCase() ||
                              "?"}
                          </div>
                          <span
                            title={online ? "En línea" : "Desconectado"}
                            className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black",
                              online
                                ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                                : "bg-zinc-400"
                            )}
                          />
                        </div>

                        {/* Name */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-black uppercase text-base sm:text-lg leading-none text-foreground">
                              {stat.profile.nombre ||
                                stat.profile.username ||
                                `Usuario #${stat.profile.display_id}`}
                            </p>
                            {(stat.profile as any).active_badge === "badge_supporter" && (
                              <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)]" />
                            )}
                            {isMe && (
                              <span className="bg-foreground text-background text-[10px] px-2 py-0.5 rounded font-black uppercase">
                                Tú
                              </span>
                            )}
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black",
                                online
                                  ? "bg-[#00FF66] text-black"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {online ? "En línea" : "Offline"}
                            </span>
                          </div>
                          <p className="font-bold text-muted-foreground uppercase text-xs">
                            Nivel {stat.level}
                          </p>
                        </div>
                      </div>

                      {/* Stat Value & Quick Chat Button */}
                      <div className="flex items-center gap-3 text-right">
                        {!isMe && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openChatWithFriend(stat.user_id)}
                            className="relative h-9 w-9 bg-[#00E5FF] hover:bg-[#00cce6] text-black border-2 border-foreground rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                            title="Enviar mensaje"
                          >
                            <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                            {unread > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF2E93] text-white text-[9px] font-black flex items-center justify-center border border-black">
                                {unread}
                              </span>
                            )}
                          </Button>
                        )}
                        <span
                          className={cn(
                            "font-black text-lg sm:text-2xl text-foreground",
                            position === 1 && "text-[#FFD700]"
                          )}
                        >
                          {getStatValue(stat)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: Friends List */}
        <TabsContent value="friends" className="space-y-6">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground"
              strokeWidth={3}
            />
            <Input
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-background border-4 border-foreground rounded-xl font-bold text-lg text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center font-black uppercase text-foreground">Cargando...</div>
          ) : friends.length === 0 ? (
            <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" strokeWidth={2} />
              <p className="font-black text-foreground text-xl uppercase mb-6">
                Aún no tienes amigos
              </p>
              <Button
                onClick={() => setAddFriendOpen(true)}
                className="bg-[#BFFF00] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:bg-[#a6e600] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_hsl(var(--foreground))] transition-all font-black uppercase h-12 rounded-lg text-base"
              >
                <UserPlus className="w-5 h-5 mr-2" strokeWidth={3} />
                Agregar tu primer amigo
              </Button>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-12 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" strokeWidth={2} />
              <p className="font-black text-foreground text-xl uppercase">
                No se encontraron amigos
              </p>
              <p className="font-bold text-muted-foreground mt-2">
                Prueba con otro nombre, username o ID.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFriends.map(friendship => {
                const stat = friendStats.find(s => s.user_id === friendship.friend.user_id);
                const online = isUserOnline(friendship.friend.user_id);
                const unread = unreadByFriend[friendship.friend.user_id] || 0;

                return (
                  <div
                    key={friendship.id}
                    className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-all flex flex-col group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar con Luz LED de En Línea */}
                        <div className="relative">
                          <div className="w-14 h-14 border-2 border-black rounded-lg bg-[#C688EB] flex items-center justify-center text-black font-black text-2xl shadow-[2px_2px_0_0_#000] group-hover:rotate-6 transition-transform">
                            {friendship.friend.nombre?.[0]?.toUpperCase() ||
                              friendship.friend.username?.[0]?.toUpperCase() ||
                              "?"}
                          </div>
                          <span
                            title={online ? "En línea ahora" : "Desconectado"}
                            className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black",
                              online
                                ? "bg-[#00FF66] shadow-[0_0_10px_#00FF66]"
                                : "bg-zinc-400"
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p
                              className="font-black text-lg uppercase leading-tight truncate max-w-[120px] text-foreground"
                              title={
                                friendship.friend.nombre ||
                                friendship.friend.username ||
                                `Usuario #${friendship.friend.display_id}`
                              }
                            >
                              {friendship.friend.nombre ||
                                friendship.friend.username ||
                                `Usuario #${friendship.friend.display_id}`}
                            </p>
                            {(friendship.friend as any).active_badge === "badge_supporter" && (
                              <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="font-bold text-muted-foreground text-xs">
                              #{friendship.friend.display_id}
                            </p>
                            <span
                              className={cn(
                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-black",
                                online
                                  ? "bg-[#00FF66] text-black"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {online ? "● En línea" : "○ Offline"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* Botón Chatear */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative text-black bg-[#00E5FF] border-2 border-foreground rounded-lg hover:bg-[#00cce6] shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all h-8 w-8"
                          onClick={() => openChatWithFriend(friendship.friend.user_id)}
                          title="Enviar mensaje directo"
                        >
                          <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
                          {unread > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF2E93] text-white text-[9px] font-black flex items-center justify-center border border-black">
                              {unread}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-black bg-[#FFD700] border-2 border-foreground rounded-lg hover:bg-[#e6c200] shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all h-8 w-8"
                          onClick={() => setChallengeTarget(friendship.friend)}
                          title="Desafiar a un juego"
                        >
                          <Swords className="w-4 h-4" strokeWidth={2.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-foreground bg-card border-2 border-foreground rounded-lg hover:bg-[#FF5C5C] hover:text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-colors h-8 w-8"
                          onClick={() => removeFriend(friendship.id)}
                          title="Eliminar amigo"
                        >
                          <UserX className="w-4 h-4" strokeWidth={2.5} />
                        </Button>
                      </div>
                    </div>

                    {stat && (
                      <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t-4 border-border">
                        <div className="flex flex-col gap-1 items-center bg-muted/50 p-2 rounded-lg border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-foreground">
                          <Zap className="w-4 h-4 text-[#FFD700]" strokeWidth={3} />
                          <span className="font-black text-[10px] uppercase">Lvl {stat.level}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-center bg-muted/50 p-2 rounded-lg border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-foreground">
                          <span className="font-black text-[10px] uppercase text-[#00E5FF] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] text-center">
                            XP
                          </span>
                          <span className="font-black text-[10px] uppercase">{stat.weekly_xp}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-center bg-muted/50 p-2 rounded-lg border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-foreground">
                          <Flame className="w-4 h-4 text-[#FF5C5C]" strokeWidth={3} />
                          <span className="font-black text-[10px] uppercase">
                            {stat.current_streak} d
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Botón ancho de mensaje directo abajo */}
                    <Button
                      onClick={() => openChatWithFriend(friendship.friend.user_id)}
                      className="mt-3 w-full bg-[#00E5FF] hover:bg-[#00cce6] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase text-xs h-9 rounded-lg gap-2"
                    >
                      <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                      <span>Chatear con {friendship.friend.nombre || friendship.friend.username}</span>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#FF2E93] text-white text-[10px] border border-black">
                          {unread} nuevos
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden mt-8">
              <div className="bg-muted border-b-4 border-foreground p-4">
                <h3 className="font-black text-foreground uppercase text-lg">
                  Solicitudes Enviadas ({sentRequests.length})
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {sentRequests.map(request => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border-2 border-foreground bg-muted flex items-center justify-center font-black text-foreground">
                        {request.friend.nombre?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="font-black uppercase text-foreground">
                        {request.friend.nombre || `Usuario #${request.friend.display_id}`}
                      </span>
                    </div>
                    <span className="bg-[#FFD700] text-black border-2 border-foreground px-3 py-1 rounded text-xs font-black uppercase shadow-[1px_1px_0_0_hsl(var(--foreground))]">
                      Pendiente
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Mensajes Directos (Chat en Tiempo Real) */}
        <TabsContent value="messages" className="space-y-4">
          {friends.length === 0 ? (
            <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" strokeWidth={2} />
              <p className="font-black text-foreground text-xl uppercase mb-4">
                Agrega amigos para intercambiar mensajes
              </p>
              <Button
                onClick={() => setAddFriendOpen(true)}
                className="bg-[#BFFF00] text-black border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] font-black uppercase h-12 rounded-lg"
              >
                <UserPlus className="w-5 h-5 mr-2" strokeWidth={3} />
                Agregar Amigo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-card border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-2xl overflow-hidden min-h-[540px]">
              {/* Columna Izquierda: Lista de Conversaciones */}
              <div className="md:col-span-4 border-b-4 md:border-b-0 md:border-r-4 border-foreground flex flex-col bg-muted/20">
                <div className="p-3.5 bg-muted border-b-4 border-foreground flex items-center justify-between">
                  <span className="font-black uppercase text-xs tracking-wider text-foreground">
                    Conversaciones ({friends.length})
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00FF66] text-black border border-black">
                    {onlineFriendsCount} online
                  </span>
                </div>

                <div className="divide-y-2 divide-border overflow-y-auto max-h-[220px] md:max-h-[480px]">
                  {friends.map(friendship => {
                    const f = friendship.friend;
                    const isSelected = f.user_id === activeChatFriendId;
                    const online = isUserOnline(f.user_id);
                    const unread = unreadByFriend[f.user_id] || 0;
                    const msgs = messagesByFriend[f.user_id] || [];
                    const lastMsg = msgs[msgs.length - 1];
                    const isTyping = typingByFriend[f.user_id];

                    return (
                      <button
                        key={friendship.id}
                        type="button"
                        onClick={() => {
                          setActiveChatFriendId(f.user_id);
                          markConversationRead(f.user_id);
                        }}
                        className={cn(
                          "w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[#FFE600]/30 dark:bg-[#FFE600]/15"
                            : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-lg bg-[#C688EB] border-2 border-black flex items-center justify-center text-black font-black text-lg shadow-[2px_2px_0_#000]">
                              {f.nombre?.[0]?.toUpperCase() || f.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span
                              className={cn(
                                "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black",
                                online
                                  ? "bg-[#00FF66] shadow-[0_0_6px_#00FF66]"
                                  : "bg-zinc-400"
                              )}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm uppercase truncate text-foreground">
                              {f.nombre || f.username || `Usuario #${f.display_id}`}
                            </p>
                            <p className="text-xs font-bold text-muted-foreground truncate">
                              {isTyping ? (
                                <span className="text-emerald-500 font-black animate-pulse">
                                  Escribiendo...
                                </span>
                              ) : lastMsg ? (
                                lastMsg.content
                              ) : (
                                "Inicia una conversación"
                              )}
                            </p>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF2E93] text-white text-xs font-black border-2 border-black shadow-[1px_1px_0_#000] shrink-0">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Ventana de Chat */}
              <div className="md:col-span-8 flex flex-col h-[480px] md:h-[540px]">
                {activeChatFriend ? (
                  <>
                    {/* Cabecera del Chat */}
                    <div className="p-3.5 bg-card border-b-4 border-foreground flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-[#00E5FF] border-2 border-black flex items-center justify-center text-black font-black text-lg shadow-[2px_2px_0_#000]">
                            {activeChatFriend.nombre?.[0]?.toUpperCase() ||
                              activeChatFriend.username?.[0]?.toUpperCase() ||
                              "?"}
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black",
                              isUserOnline(activeChatFriend.user_id)
                                ? "bg-[#00FF66] shadow-[0_0_8px_#00FF66]"
                                : "bg-zinc-400"
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-sm sm:text-base text-foreground leading-tight">
                            {activeChatFriend.nombre ||
                              activeChatFriend.username ||
                              `Usuario #${activeChatFriend.display_id}`}
                          </h3>
                          <p className="text-[11px] font-bold text-muted-foreground">
                            {typingByFriend[activeChatFriend.user_id] ? (
                              <span className="text-emerald-500 font-black">
                                Escribiendo un mensaje...
                              </span>
                            ) : isUserOnline(activeChatFriend.user_id) ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                ● En línea ahora
                              </span>
                            ) : (
                              <span>○ Desconectado</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setChallengeTarget(activeChatFriend)}
                        className="bg-[#FFD700] hover:bg-[#e6c200] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase text-xs rounded-lg gap-1.5"
                      >
                        <Swords className="w-4 h-4 stroke-[2.5]" />
                        <span className="hidden sm:inline">Desafiar</span>
                      </Button>
                    </div>

                    {/* Historial de Mensajes */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-background/60">
                      {currentChatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                          <MessageSquare className="w-12 h-12 mb-2 opacity-40" />
                          <p className="font-black uppercase text-sm text-foreground">
                            Sin mensajes todavía
                          </p>
                          <p className="text-xs font-bold mt-1 max-w-xs">
                            Envíale un mensaje o usa una respuesta rápida abajo para coordinar estudio o partidas.
                          </p>
                        </div>
                      ) : (
                        currentChatMessages.map(msg => {
                          const isMine =
                            msg.senderId === user?.id || (msg.senderId === "guest" && !user);
                          const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex flex-col max-w-[82%] sm:max-w-[72%]",
                                isMine ? "ml-auto items-end" : "mr-auto items-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "px-3.5 py-2.5 rounded-2xl border-2 border-black shadow-[3px_3px_0_#000] text-sm font-bold break-words",
                                  isMine
                                    ? "bg-[#BFFF00] text-black rounded-br-none"
                                    : "bg-card text-foreground rounded-bl-none"
                                )}
                              >
                                {msg.content}
                              </div>
                              <div className="flex items-center gap-1 mt-1 px-1 text-[10px] font-bold text-muted-foreground">
                                <span>{timeStr}</span>
                                {isMine && (
                                  <CheckCheck
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      msg.read ? "text-[#00E5FF]" : "text-muted-foreground"
                                    )}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Respuestas rápidas */}
                    <div className="px-3 py-2 bg-muted/40 border-t-2 border-border flex items-center gap-1.5 overflow-x-auto">
                      {QUICK_MESSAGES.map((qm, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendChatMessage(qm)}
                          className="px-2.5 py-1 rounded-lg bg-card hover:bg-[#FFE600] hover:text-black text-foreground border border-foreground text-[11px] font-black whitespace-nowrap transition-colors cursor-pointer shrink-0"
                        >
                          {qm}
                        </button>
                      ))}
                    </div>

                    {/* Input de Mensaje */}
                    <div className="p-3 bg-card border-t-4 border-foreground flex items-center gap-2">
                      <Input
                        value={messageInput}
                        onChange={e => {
                          setMessageInput(e.target.value);
                          sendTyping(activeChatFriend.user_id);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        placeholder={`Escribe un mensaje a ${
                          activeChatFriend.nombre || activeChatFriend.username
                        }...`}
                        className="flex-1 bg-background border-2 border-foreground rounded-xl font-bold text-foreground focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        onClick={() => handleSendChatMessage()}
                        disabled={!messageInput.trim()}
                        className="bg-[#00E5FF] hover:bg-[#00cce6] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase rounded-xl px-4"
                      >
                        <Send className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                        Enviar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground font-bold">
                    Selecciona un amigo de la lista para chatear.
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal para elegir minijuego al desafiar a un amigo */}
      <Dialog open={!!challengeTarget} onOpenChange={v => !v && setChallengeTarget(null)}>
        <DialogContent className="bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-xl flex items-center gap-2 border-b-4 border-foreground pb-3 text-foreground">
              <Swords className="w-6 h-6 text-[#FFD700]" />
              Desafiar a {challengeTarget?.nombre || challengeTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs font-black uppercase text-muted-foreground">
              Elegí el minijuego para el duelo:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: "penales", name: "Penales", icon: "⚽", color: "#BFFF00" },
                { type: "tateti", name: "Ta-Te-Ti", icon: "❌", color: "#00E5FF" },
                { type: "bomba", name: "La Bomba", icon: "💣", color: "#FF9B71" },
                { type: "batalla", name: "Batalla RPG", icon: "⚔️", color: "#C688EB" },
                { type: "karts", name: "Karts", icon: "🏎️", color: "#FF5C5C" },
                { type: "ajedrez", name: "Ajedrez", icon: "👑", color: "#FFF7E6" },
              ].map(g => (
                <button
                  key={g.type}
                  disabled={challenging}
                  onClick={() => handleLaunchChallenge(g.type)}
                  className="p-3 bg-muted/40 border-2 border-foreground rounded-xl shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] transition-all flex flex-col items-center gap-1.5 font-black uppercase text-xs text-foreground text-center"
                  style={{ borderLeftColor: g.color, borderLeftWidth: "6px" }}
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span>{g.name}</span>
                </button>
              ))}
            </div>
            {challenging && (
              <p className="text-xs font-bold text-center text-muted-foreground animate-pulse">
                Creando sala y enviando invitación...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
