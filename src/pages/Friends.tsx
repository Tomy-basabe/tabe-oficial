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
  IdCard,
  Loader2,
  BookOpen,
  X,
  Sparkles,
  ShieldCheck,
  AtSign,
  Share2,
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
import UserInfoCard from "@/components/friends/UserInfoCard";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const QUICK_MESSAGES = [
  "¡Vamos a meterle una sesión de Pomodoro! 🍅",
  "¿Jugamos un desafío rápido? ⚔️",
  "¡Qué buena racha llevás esta semana! 🔥",
  "¿Repasamos juntos para el parcial? 📚",
];

const GAME_OPTIONS = [
  { type: "penales", name: "Penales", desc: "Tiros y atajadas", icon: "⚽" },
  { type: "tateti", name: "Ta-Te-Ti", desc: "3 en raya clásico", icon: "❌" },
  { type: "bomba", name: "La Bomba", desc: "Preguntas contrarreloj", icon: "💣" },
  { type: "batalla", name: "Batalla RPG", desc: "Duelo por turnos", icon: "⚔️" },
  { type: "karts", name: "Karts", desc: "Carrera de velocidad", icon: "🏎️" },
  { type: "ajedrez", name: "Ajedrez", desc: "Estrategia mental", icon: "👑" },
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
  const myStat = friendStats.find(s => s.user_id === user?.id || (s.user_id === "guest" && !user));

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Notion/ChatGPT Style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Amigos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {onlineFriendsCount} en línea
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Compite en el ranking semanal, chatea en tiempo real y reta a tus compañeros de estudio.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Toggle de Notificaciones de Mensajes */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleNotifications}
            className={cn(
              "h-9 px-3 rounded-xl border-zinc-200/80 dark:border-zinc-800 transition-colors text-xs font-medium gap-2 shadow-2xs",
              notificationsEnabled
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-white dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            title={
              notificationsEnabled
                ? "Notificaciones de mensajes activadas (clic para silenciar)"
                : "Notificaciones de mensajes silenciadas (clic para activar)"
            }
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            ) : (
              <BellOff className="w-4 h-4 text-zinc-400" />
            )}
            <span className="hidden sm:inline">
              {notificationsEnabled ? "Avisos activados" : "Avisos silenciados"}
            </span>
          </Button>

          {/* Add Friend Button & Dialog */}
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-9 px-3.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-xs font-medium gap-1.5 shadow-xs flex-1 sm:flex-none"
              >
                <UserPlus className="w-4 h-4" />
                <span>Agregar amigo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      Agregar compañero
                    </DialogTitle>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Ingresa el ID o username para conectar y compartir notas
                    </p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    ID o nombre de usuario
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Ej: 12345 o @usuario"
                      value={friendIdentifier}
                      onChange={e => setFriendIdentifier(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSendRequest()}
                      className="pl-9 h-10 bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-zinc-400"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    El ID único de cada usuario se encuentra en la pestaña "Mi Info".
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddFriendOpen(false)}
                    className="rounded-xl h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendRequest}
                    disabled={sendingRequest || !friendIdentifier.trim()}
                    className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl h-9 text-xs font-medium gap-1.5"
                  >
                    {sendingRequest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{sendingRequest ? "Enviando..." : "Enviar solicitud"}</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Requests Banner */}
      {pendingRequests.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Solicitudes de amistad pendientes
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {pendingRequests.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-2xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-200/80 dark:border-zinc-700">
                    {request.friend.nombre?.[0]?.toUpperCase() ||
                      request.friend.username?.[0]?.toUpperCase() ||
                      "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {request.friend.nombre ||
                        request.friend.username ||
                        `Usuario #${request.friend.display_id}`}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      #{request.friend.display_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs"
                    onClick={() => respondToRequest(request.id, true)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs"
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

      {/* Main Tabs Navigation */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800 h-auto">
          <TabsTrigger
            value="leaderboard"
            className="rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Trophy className="w-4 h-4" />
            <span>Ranking</span>
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Users className="w-4 h-4" />
            <span>Amigos ({friends.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="relative rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mensajes</span>
            {totalUnread > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                {totalUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="rounded-lg py-2.5 px-3 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <IdCard className="w-4 h-4" />
            <span>Mi Info</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Ranking / Leaderboard */}
        <TabsContent value="leaderboard" className="space-y-4">
          {/* Sub-filtros de Ranking */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-100/80 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl">
            {[
              { key: "xp", label: "XP Total", icon: Zap },
              { key: "pomodoro", label: "Pomodoro", icon: Clock },
              { key: "study", label: "Horas de Estudio", icon: BookOpen },
              { key: "streak", label: "Racha", icon: Flame },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setLeaderboardType(key as typeof leaderboardType)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                  leaderboardType === key
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tabla / Tarjeta de Ranking */}
          <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-sm font-medium flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                <span>Cargando posiciones del ranking...</span>
              </div>
            ) : friendStats.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Aún no hay participantes en el ranking
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Agrega a tus amigos y compañeros de estudio para empezar a medir tu rendimiento semanal.
                </p>
                <Button
                  size="sm"
                  onClick={() => setAddFriendOpen(true)}
                  className="rounded-xl text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Agregar primer amigo
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {getSortedStats().map((stat, index) => {
                  const isMe = stat.user_id === user?.id || (stat.user_id === "guest" && !user);
                  const position = index + 1;
                  const online = isUserOnline(stat.user_id);
                  const unread = unreadByFriend[stat.user_id] || 0;

                  return (
                    <div
                      key={stat.user_id}
                      className={cn(
                        "flex items-center justify-between p-4 sm:px-6 transition-colors",
                        isMe
                          ? "bg-zinc-50/80 dark:bg-zinc-800/40"
                          : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                      )}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Posición Medalla / Número */}
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                            position === 1
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : position === 2
                              ? "bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600"
                              : position === 3
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                              : "text-zinc-400 font-mono"
                          )}
                        >
                          {position === 1 ? (
                            <Crown className="w-4 h-4 fill-amber-500/20" />
                          ) : (
                            position
                          )}
                        </div>

                        {/* Avatar con Indicador En Línea */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-sm shadow-2xs">
                            {stat.profile.nombre?.[0]?.toUpperCase() ||
                              stat.profile.username?.[0]?.toUpperCase() ||
                              "?"}
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900",
                              online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                            )}
                            title={online ? "En línea" : "Desconectado"}
                          />
                        </div>

                        {/* Nombre & Badges */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {stat.profile.nombre ||
                                stat.profile.username ||
                                `Usuario #${stat.profile.display_id}`}
                            </p>
                            {(stat.profile as any).active_badge === "badge_supporter" && (
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            {isMe && (
                              <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] px-2 py-0.2 rounded-full font-medium">
                                Tú
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                            Nivel {stat.level}
                          </p>
                        </div>
                      </div>

                      {/* Stat Value & Botón Chatear */}
                      <div className="flex items-center gap-3 shrink-0">
                        {!isMe && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openChatWithFriend(stat.user_id)}
                            className="relative h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                            title="Enviar mensaje"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                                {unread}
                              </span>
                            )}
                          </Button>
                        )}
                        <span
                          className={cn(
                            "font-semibold text-sm sm:text-base font-mono",
                            position === 1
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-zinc-900 dark:text-zinc-100"
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

        {/* TAB 2: Lista de Amigos */}
        <TabsContent value="friends" className="space-y-6">
          {/* Buscador Notion Style */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar amigos por nombre, usuario o ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-11 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400 text-sm font-medium flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              <span>Cargando lista de amigos...</span>
            </div>
          ) : friends.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Aún no tienes amigos agregados
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Conecta con tus compañeros de clase para compartir apuntes, estudiar y competir.
              </p>
              <Button
                size="sm"
                onClick={() => setAddFriendOpen(true)}
                className="rounded-xl text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Agregar tu primer amigo
              </Button>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs space-y-2">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                No se encontraron amigos
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Prueba con otro término de búsqueda o revisa el número de ID.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFriends.map(friendship => {
                const stat = friendStats.find(s => s.user_id === friendship.friend.user_id);
                const online = isUserOnline(friendship.friend.user_id);
                const unread = unreadByFriend[friendship.friend.user_id] || 0;

                return (
                  <div
                    key={friendship.id}
                    className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar con Estado */}
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-base shadow-2xs">
                              {friendship.friend.nombre?.[0]?.toUpperCase() ||
                                friendship.friend.username?.[0]?.toUpperCase() ||
                                "?"}
                            </div>
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900",
                                online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                              )}
                              title={online ? "En línea" : "Desconectado"}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p
                                className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate"
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
                                <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs text-zinc-400">
                                #{friendship.friend.display_id}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.2 rounded-full",
                                  online
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                                )}
                              >
                                {online ? "En línea" : "Desconectado"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción Rápida */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openChatWithFriend(friendship.friend.user_id)}
                            className="relative h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Enviar mensaje directo"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                                {unread}
                              </span>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setChallengeTarget(friendship.friend)}
                            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10"
                            title="Desafiar a un juego"
                          >
                            <Swords className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFriend(friendship.id)}
                            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10"
                            title="Eliminar amigo"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {stat && (
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-100 dark:border-zinc-800 mb-3 text-center">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 uppercase font-medium">Nivel</span>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                              Lvl {stat.level}
                            </span>
                          </div>
                          <div className="flex flex-col border-x border-zinc-100 dark:border-zinc-800">
                            <span className="text-[10px] text-zinc-400 uppercase font-medium">XP</span>
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                              {stat.weekly_xp}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-400 uppercase font-medium">Racha</span>
                            <span className="text-xs font-semibold text-rose-500">
                              {stat.current_streak} d
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => openChatWithFriend(friendship.friend.user_id)}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 rounded-xl border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 gap-2 mt-2 shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chatear</span>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-semibold">
                          {unread}
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Solicitudes Enviadas */}
          {sentRequests.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3 mt-8">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Solicitudes enviadas ({sentRequests.length})
              </h3>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sentRequests.map(request => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-200">
                        {request.friend.nombre?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {request.friend.nombre || `Usuario #${request.friend.display_id}`}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      Esperando respuesta
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Mensajes Directos (Chat ChatGPT/Notion Style) */}
        <TabsContent value="messages" className="space-y-4">
          {friends.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Agrega amigos para intercambiar mensajes
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Coordina sesiones de estudio, comparte dudas o desafía a un minijuego en tiempo real.
              </p>
              <Button
                size="sm"
                onClick={() => setAddFriendOpen(true)}
                className="rounded-xl text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Agregar amigo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden min-h-[560px]">
              {/* Columna Izquierda: Lista de Conversaciones */}
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Conversaciones ({friends.length})
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                    {onlineFriendsCount} online
                  </span>
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-y-auto max-h-[220px] md:max-h-[500px]">
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
                            ? "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-l-2 border-zinc-900 dark:border-zinc-100"
                            : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-sm shadow-2xs">
                              {f.nombre?.[0]?.toUpperCase() || f.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900",
                                online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                              )}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                              {f.nombre || f.username || `Usuario #${f.display_id}`}
                            </p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                              {isTyping ? (
                                <span className="text-emerald-500 font-medium animate-pulse">
                                  Escribiendo...
                                </span>
                              ) : lastMsg ? (
                                lastMsg.content
                              ) : (
                                "Inicia la conversación"
                              )}
                            </p>
                          </div>
                        </div>

                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold shrink-0">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha: Ventana de Chat */}
              <div className="md:col-span-8 flex flex-col h-[500px] md:h-[560px]">
                {activeChatFriend ? (
                  <>
                    {/* Cabecera del Chat */}
                    <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 bg-white dark:bg-zinc-900">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-sm shadow-2xs">
                            {activeChatFriend.nombre?.[0]?.toUpperCase() ||
                              activeChatFriend.username?.[0]?.toUpperCase() ||
                              "?"}
                          </div>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900",
                              isUserOnline(activeChatFriend.user_id)
                                ? "bg-emerald-500"
                                : "bg-zinc-300 dark:bg-zinc-600"
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                            {activeChatFriend.nombre ||
                              activeChatFriend.username ||
                              `Usuario #${activeChatFriend.display_id}`}
                          </h3>
                          <p className="text-[11px] text-zinc-400">
                            {typingByFriend[activeChatFriend.user_id] ? (
                              <span className="text-emerald-500 font-medium">
                                Escribiendo...
                              </span>
                            ) : isUserOnline(activeChatFriend.user_id) ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                En línea
                              </span>
                            ) : (
                              <span>Desconectado</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setChallengeTarget(activeChatFriend)}
                        className="h-8 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-medium gap-1.5 shadow-2xs"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Desafiar</span>
                      </Button>
                    </div>

                    {/* Historial de Mensajes */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50/40 dark:bg-zinc-900/20">
                      {currentChatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                          <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                          <p className="font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                            Sin mensajes todavía
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                            Comienza saludando o utiliza una de las respuestas rápidas para invitar a una sesión.
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
                                "flex flex-col max-w-[82%] sm:max-w-[70%]",
                                isMine ? "ml-auto items-end" : "mr-auto items-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-2xs",
                                  isMine
                                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs font-normal"
                                    : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs border border-zinc-200/60 dark:border-zinc-700/60 font-normal"
                                )}
                              >
                                {msg.content}
                              </div>
                              <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-zinc-400">
                                <span>{timeStr}</span>
                                {isMine && (
                                  <CheckCheck
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      msg.read ? "text-sky-500" : "text-zinc-400"
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

                    {/* Respuestas rápidas ChatGPT chips */}
                    <div className="px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto">
                      {QUICK_MESSAGES.map((qm, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendChatMessage(qm)}
                          className="px-3 py-1 rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          {qm}
                        </button>
                      ))}
                    </div>

                    {/* Input de Mensaje Notion/ChatGPT Style */}
                    <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2">
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
                        className="flex-1 bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 h-10"
                      />
                      <Button
                        type="button"
                        onClick={() => handleSendChatMessage()}
                        disabled={!messageInput.trim()}
                        className="h-10 px-3.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-xs font-medium gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Enviar</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-400 text-xs">
                    Selecciona una conversación de la columna izquierda para ver o enviar mensajes.
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 4: Información del usuario y Pase de Estudiante */}
        <TabsContent value="info" className="space-y-6">
          {/* Tarjeta 3D interactiva con iluminación escénica */}
          {mainTab === "info" && (
            <UserInfoCard
              name={myProfile?.nombre || myProfile?.username || "Usuario"}
              id={String(myProfile?.display_id || "...")}
            />
          )}

          {/* Bento Grid: Datos de tu Perfil y Opciones de Conexión */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Bloque 1: ID de Estudiante y Enlace Directo (col-span-12 md:col-span-7) */}
            <div className="md:col-span-7 p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Identificador de Estudiante
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Pase Verificado
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Comparte tu número de ID para que tus compañeros puedan encontrarte y agregarte al instante.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-zinc-400 uppercase">Tu ID Único</span>
                  <span className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    #{myProfile?.display_id || "..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium gap-1.5 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    onClick={copyId}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-zinc-500" />
                        <span>Copiar ID</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700"
                    title="Compartir ID"
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: "Mi ID de TABE",
                            text: `¡Agregame en TABE con mi ID #${myProfile?.display_id}!`,
                          })
                          .catch(() => copyId());
                      } else {
                        copyId();
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Bloque 2: Nombre de Usuario @username (col-span-12 md:col-span-5) */}
            <div className="md:col-span-5 p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Nombre de Usuario
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Visible en clasificaciones, salas de estudio y búsquedas rápidas.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                {editingUsername ? (
                  <div className="space-y-2.5">
                    <div className="relative">
                      <AtSign className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="nuevo_username"
                        className="pl-8 h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus-visible:ring-1 focus-visible:ring-zinc-400 font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 text-xs font-medium flex-1"
                        onClick={handleUpdateUsername}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl text-xs font-medium flex-1"
                        onClick={() => setEditingUsername(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium text-zinc-400 uppercase">Handle Público</span>
                      <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {myProfile?.username ? `@${myProfile.username}` : "Sin configurar"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 rounded-xl text-xs font-medium border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      onClick={() => setEditingUsername(true)}
                    >
                      {myProfile?.username ? "Cambiar" : "Configurar"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bloque 3: Resumen de Progreso Social y Compañeros (col-span-12) */}
            <div className="md:col-span-12 p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Estadísticas de tu Pase Estudiantil
                  </span>
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  Temporada Académica 2026
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase">Amigos</span>
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {friends.length}
                  </span>
                  <span className="text-[10px] text-zinc-400">Compañeros conectados</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase">Nivel</span>
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    Lvl {myStat?.level || 1}
                  </span>
                  <span className="text-[10px] text-zinc-400">{myStat?.weekly_xp || 0} XP semanal</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase">Racha</span>
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <span className="text-xl font-bold font-mono text-rose-500">
                    {myStat?.current_streak || 0} días
                  </span>
                  <span className="text-[10px] text-zinc-400">Estudio constante</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase">Pomodoro</span>
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
                    {(myStat?.weekly_pomodoro_hours || 0).toFixed(1)} h
                  </span>
                  <span className="text-[10px] text-zinc-400">Horas enfocadas</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal para elegir minijuego al desafiar a un amigo Notion/ChatGPT Style */}
      <Dialog open={!!challengeTarget} onOpenChange={v => !v && setChallengeTarget(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xl rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Desafiar a {challengeTarget?.nombre || challengeTarget?.username}
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Elige un minijuego para competir en tiempo real:
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-3">
            {GAME_OPTIONS.map(g => (
              <button
                key={g.type}
                type="button"
                disabled={challenging}
                onClick={() => handleLaunchChallenge(g.type)}
                className="group p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-all text-left flex flex-col justify-between gap-2 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{g.icon}</span>
                  <Swords className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {g.name}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {g.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {challenging && (
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Creando sala y enviando invitación...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
