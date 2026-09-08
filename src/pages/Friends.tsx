import { useState } from "react";
import { Users, UserPlus, Trophy, Clock, Flame, Zap, Search, Copy, Check, Bell, UserX, Crown } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function Friends() {
  const { user } = useAuth();
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
    updateUsername
  } = useFriends();

  const [activeTab, setActiveTab] = useState("ranking");
  const [rankingPeriod, setRankingPeriod] = useState<"weekly" | "monthly" | "all">("weekly");
  const [searchQuery, setSearchQuery] = useState("");
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendIdentifier, setFriendIdentifier] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [leaderboardType, setLeaderboardType] = useState<'xp' | 'pomodoro' | 'study' | 'streak'>('xp');

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
        case 'xp':
          return b.weekly_xp - a.weekly_xp;
        case 'pomodoro':
          return b.weekly_pomodoro_hours - a.weekly_pomodoro_hours;
        case 'study':
          return b.weekly_study_hours - a.weekly_study_hours;
        case 'streak':
          return b.current_streak - a.current_streak;
        default:
          return 0;
      }
    });
  };

  const getStatValue = (stat: typeof friendStats[0]) => {
    switch (leaderboardType) {
      case 'xp':
        return `${stat.weekly_xp.toLocaleString()} XP`;
      case 'pomodoro':
        return `${stat.weekly_pomodoro_hours.toFixed(1)}h`;
      case 'study':
        return `${stat.weekly_study_hours.toFixed(1)}h`;
      case 'streak':
        return `${stat.current_streak} días`;
    }
  };

  const getLeaderboardIcon = () => {
    switch (leaderboardType) {
      case 'xp':
        return <Zap className="w-4 h-4" />;
      case 'pomodoro':
        return <Clock className="w-4 h-4" />;
      case 'study':
        return <Clock className="w-4 h-4" />;
      case 'streak':
        return <Flame className="w-4 h-4" />;
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredFriends = friends.filter((friendship) => {
    if (!normalizedSearchQuery) return true;

    const profile = friendship.friend;
    return Boolean(
      profile.nombre?.toLowerCase().includes(normalizedSearchQuery) ||
      profile.username?.toLowerCase().includes(normalizedSearchQuery) ||
      profile.display_id.toString().includes(normalizedSearchQuery)
    );
  });

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase text-foreground flex items-center gap-3">
            <Users className="w-10 h-10 text-foreground" strokeWidth={3} />
            Amigos
          </h1>
          <p className="text-muted-foreground font-bold uppercase mt-1">
            Compite con tus amigos y mide tu progreso
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* My ID Card */}
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] px-4 py-2 rounded-xl flex items-center justify-between gap-4 flex-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted-foreground leading-none">Mi ID</span>
              <span className="font-black text-lg text-foreground leading-tight">
                #{myProfile?.display_id || '...'}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-[#BFFF00] text-black border-2 border-foreground rounded-lg hover:bg-[#a6e600] hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] transition-all"
              onClick={copyId}
            >
              {copied ? <Check className="w-5 h-5 text-black" strokeWidth={3} /> : <Copy className="w-5 h-5 text-black" strokeWidth={2.5} />}
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
                <DialogTitle className="font-black uppercase text-2xl border-b-4 border-foreground pb-4 text-foreground">Agregar Amigo</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground">
                    Ingresa el ID o username de tu amigo
                  </label>
                  <Input
                    placeholder="Ej: 12345 o @username"
                    value={friendIdentifier}
                    onChange={(e) => setFriendIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
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
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="nuevo_username"
                className="w-full sm:w-48 bg-background border-2 border-foreground rounded-lg font-bold text-foreground focus-visible:ring-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              />
              <div className="flex gap-2">
                <Button className="bg-[#BFFF00] text-black border-2 border-foreground hover:bg-[#a6e600] font-black uppercase rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] flex-1" onClick={handleUpdateUsername}>Guardar</Button>
                <Button className="bg-card text-foreground border-2 border-foreground hover:bg-muted font-black uppercase rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] flex-1" onClick={() => setEditingUsername(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button className="bg-card text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:bg-muted hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all font-black uppercase rounded-lg w-full sm:w-auto" onClick={() => setEditingUsername(true)}>
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
            <h2 className="font-black uppercase text-xl">Solicitudes Pendientes ({pendingRequests.length})</h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#C688EB] border-2 border-black flex items-center justify-center text-black font-black text-xl shadow-[2px_2px_0_0_#000]">
                    {request.friend.nombre?.[0]?.toUpperCase() || request.friend.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-black text-lg text-foreground uppercase leading-tight">{request.friend.nombre || request.friend.username || `Usuario #${request.friend.display_id}`}</p>
                    <p className="font-bold text-muted-foreground text-sm">#{request.friend.display_id}</p>
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

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-muted p-1 border-4 border-foreground rounded-xl h-auto">
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase py-3 rounded-lg text-foreground transition-all">
            <Trophy className="w-5 h-5 mr-2" strokeWidth={2.5} />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="friends" className="data-[state=active]:bg-card data-[state=active]:border-2 data-[state=active]:border-foreground data-[state=active]:shadow-[2px_2px_0_0_hsl(var(--foreground))] font-black uppercase py-3 rounded-lg text-foreground transition-all">
            <Users className="w-5 h-5 mr-2" strokeWidth={2.5} />
            Lista de Amigos
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          {/* Leaderboard Type Selector */}
          <div className="flex flex-wrap gap-3 p-4 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl">
            {[
              { key: 'xp', label: 'XP Total', icon: Zap, color: '#FFD700' },
              { key: 'pomodoro', label: 'Horas Pomodoro', icon: Clock, color: '#00E5FF' },
              { key: 'study', label: 'Horas Estudio', icon: Clock, color: '#C688EB' },
              { key: 'streak', label: 'Racha', icon: Flame, color: '#FF5C5C' }
            ].map(({ key, label, icon: Icon, color }) => (
              <Button
                key={key}
                onClick={() => setLeaderboardType(key as typeof leaderboardType)}
                className={cn(
                  "font-black uppercase border-2 border-foreground rounded-lg transition-all h-10",
                  leaderboardType === key 
                    ? `bg-[${color}] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]` 
                    : "bg-card text-foreground hover:bg-muted hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px]"
                )}
                style={leaderboardType === key ? { backgroundColor: color } : {}}
              >
                <Icon className="w-4 h-4 mr-2" strokeWidth={3} />
                {label}
              </Button>
            ))}
          </div>

          {/* Leaderboard */}
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
                  const isMe = stat.user_id === user?.id;
                  const position = index + 1;

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
                      <div className="flex items-center gap-4 sm:gap-6">
                        {/* Position */}
                        <div className={cn(
                          "w-10 h-10 border-2 border-foreground rounded-lg flex items-center justify-center font-black text-lg shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                          position === 1 ? "bg-[#FFD700] text-black" :
                          position === 2 ? "bg-muted text-foreground" :
                          position === 3 ? "bg-[#FF9B71] text-black" :
                          "bg-card text-foreground"
                        )}>
                          {position === 1 ? <Crown className="w-5 h-5" strokeWidth={3} /> : position}
                        </div>

                        {/* Avatar */}
                        <div className={cn(
                          "w-12 h-12 border-2 border-black rounded-lg flex items-center justify-center font-black text-xl shadow-[2px_2px_0_0_#000]",
                          isMe ? "bg-[#00E5FF] text-black" : "bg-[#C688EB] text-black"
                        )}>
                          {stat.profile.nombre?.[0]?.toUpperCase() || stat.profile.username?.[0]?.toUpperCase() || '?'}
                        </div>

                        {/* Name */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black uppercase text-lg leading-none text-foreground">
                              {stat.profile.nombre || stat.profile.username || `Usuario #${stat.profile.display_id}`}
                            </p>
                            {/* @ts-ignore */}
                            {(stat.profile as any).active_badge === 'badge_supporter' && (
                              <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)]" />
                            )}
                            {isMe && <span className="bg-foreground text-background text-[10px] px-2 py-0.5 rounded font-black uppercase">Tú</span>}
                          </div>
                          <p className="font-bold text-muted-foreground uppercase text-xs">Nivel {stat.level}</p>
                        </div>
                      </div>

                      {/* Stat Value */}
                      <div className="flex items-center gap-2 text-right">
                        <span className={cn(
                          "font-black text-xl sm:text-2xl text-foreground",
                          position === 1 && "text-[#FFD700]"
                        )}>
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

        {/* Friends List Tab */}
        <TabsContent value="friends" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" strokeWidth={3} />
            <Input
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-background border-4 border-foreground rounded-xl font-bold text-lg text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus-visible:ring-0 focus-visible:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            />
          </div>

          {/* Friends Grid */}
          {loading ? (
            <div className="p-8 text-center font-black uppercase text-foreground">Cargando...</div>
          ) : friends.length === 0 ? (
            <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" strokeWidth={2} />
              <p className="font-black text-foreground text-xl uppercase mb-6">Aún no tienes amigos</p>
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
              <p className="font-black text-foreground text-xl uppercase">No se encontraron amigos</p>
              <p className="font-bold text-muted-foreground mt-2">Prueba con otro nombre, username o ID.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFriends.map((friendship) => {
                  const stat = friendStats.find(s => s.user_id === friendship.friend.user_id);

                  return (
                    <div key={friendship.id} className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-all flex flex-col group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 border-2 border-black rounded-lg bg-[#C688EB] flex items-center justify-center text-black font-black text-2xl shadow-[2px_2px_0_0_#000] group-hover:rotate-6 transition-transform">
                            {friendship.friend.nombre?.[0]?.toUpperCase() || friendship.friend.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-lg uppercase leading-tight truncate max-w-[120px] text-foreground" title={friendship.friend.nombre || friendship.friend.username || `Usuario #${friendship.friend.display_id}`}>
                                {friendship.friend.nombre || friendship.friend.username || `Usuario #${friendship.friend.display_id}`}
                              </p>
                              {/* @ts-ignore */}
                              {(friendship.friend as any).active_badge === 'badge_supporter' && (
                                <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] flex-shrink-0" />
                              )}
                            </div>
                            <p className="font-bold text-muted-foreground text-sm mt-0.5">#{friendship.friend.display_id}</p>
                          </div>
                        </div>
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

                      {stat && (
                        <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t-4 border-border">
                          <div className="flex flex-col gap-1 items-center bg-muted/50 p-2 rounded-lg border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-foreground">
                            <Zap className="w-4 h-4 text-[#FFD700]" strokeWidth={3} />
                            <span className="font-black text-[10px] uppercase">Lvl {stat.level}</span>
                          </div>
                          <div className="flex flex-col gap-1 items-center bg-muted/50 p-2 rounded-lg border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-foreground">
                            <span className="font-black text-[10px] uppercase text-[#00E5FF] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] text-center">XP</span>
                            <span className="font-black text-[10px] uppercase">{stat.weekly_xp}</span>
                          </div>
                          <div className="flex flex-col gap-1 items-center bg-muted/50 p-2 rounded-lg border-2 border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))] text-foreground">
                            <Flame className="w-4 h-4 text-[#FF5C5C]" strokeWidth={3} />
                            <span className="font-black text-[10px] uppercase">{stat.current_streak} d</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
              })}
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl overflow-hidden mt-8">
              <div className="bg-muted border-b-4 border-foreground p-4">
                <h3 className="font-black text-foreground uppercase text-lg">Solicitudes Enviadas ({sentRequests.length})</h3>
              </div>
              <div className="p-4 space-y-3">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border-2 border-foreground bg-muted flex items-center justify-center font-black text-foreground">
                        {request.friend.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-black uppercase text-foreground">{request.friend.nombre || `Usuario #${request.friend.display_id}`}</span>
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
      </Tabs>
    </div>
  );
}
