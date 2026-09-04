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

  const [searchQuery, setSearchQuery] = useState("");
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendIdentifier, setFriendIdentifier] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<'xp' | 'pomodoro' | 'study' | 'streak'>('xp');

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

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase text-black flex items-center gap-3">
            <Users className="w-10 h-10 text-black" strokeWidth={3} />
            Amigos
          </h1>
          <p className="text-black/60 font-bold uppercase mt-1">
            Compite con tus amigos y mide tu progreso
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* My ID Card */}
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] px-4 py-2 rounded-xl flex items-center justify-between gap-4 flex-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-black/50 leading-none">Mi ID</span>
              <span className="font-black text-lg text-black leading-tight">
                #{myProfile?.display_id || '...'}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-[#BFFF00] border-2 border-black rounded-lg hover:bg-[#a6e600] hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
              onClick={copyId}
            >
              {copied ? <Check className="w-5 h-5 text-black" strokeWidth={3} /> : <Copy className="w-5 h-5 text-black" strokeWidth={2.5} />}
            </Button>
          </div>

          {/* Add Friend Button */}
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00E5FF] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#00cce6] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all font-black uppercase h-14 px-6 rounded-xl text-lg w-full sm:w-auto">
                <UserPlus className="w-6 h-6 mr-2" strokeWidth={3} />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-black uppercase text-2xl border-b-4 border-black pb-4">Agregar Amigo</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-black/60">
                    Ingresa el ID o username de tu amigo
                  </label>
                  <Input
                    placeholder="Ej: 12345 o @username"
                    value={friendIdentifier}
                    onChange={(e) => setFriendIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                    className="border-4 border-black shadow-[4px_4px_0_0_#000] rounded-lg h-12 font-bold text-lg focus-visible:ring-0 focus-visible:border-black focus-visible:shadow-[2px_2px_0_0_#000]"
                  />
                </div>
                <Button
                  className="w-full bg-[#BFFF00] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#a6e600] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_#000] transition-all font-black uppercase h-14 rounded-xl text-lg"
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
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase text-black/50">Tu username</span>
            {myProfile?.username ? (
              <span className="font-black text-xl text-black">@{myProfile.username}</span>
            ) : (
              <span className="font-bold text-black/40 italic">No configurado</span>
            )}
          </div>
          {editingUsername ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="nuevo_username"
                className="w-full sm:w-48 border-2 border-black rounded-lg font-bold focus-visible:ring-0 focus-visible:border-black shadow-[2px_2px_0_0_#000]"
              />
              <div className="flex gap-2">
                <Button className="bg-[#BFFF00] text-black border-2 border-black hover:bg-[#a6e600] font-black uppercase rounded-lg shadow-[2px_2px_0_0_#000] flex-1" onClick={handleUpdateUsername}>Guardar</Button>
                <Button className="bg-white text-black border-2 border-black hover:bg-gray-100 font-black uppercase rounded-lg shadow-[2px_2px_0_0_#000] flex-1" onClick={() => setEditingUsername(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button className="bg-white text-black border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-gray-100 hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] transition-all font-black uppercase rounded-lg w-full sm:w-auto" onClick={() => setEditingUsername(true)}>
              {myProfile?.username ? "Cambiar" : "Configurar"}
            </Button>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-[#FFD700] border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden">
          <div className="bg-black text-[#FFD700] p-4 flex items-center gap-3">
            <Bell className="w-6 h-6" strokeWidth={3} />
            <h2 className="font-black uppercase text-xl">Solicitudes Pendientes ({pendingRequests.length})</h2>
          </div>
          <div className="p-4 space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border-2 border-black shadow-[2px_2px_0_0_#000] rounded-xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#C688EB] border-2 border-black flex items-center justify-center text-black font-black text-xl shadow-[2px_2px_0_0_#000]">
                    {request.friend.nombre?.[0]?.toUpperCase() || request.friend.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-black text-lg text-black uppercase leading-tight">{request.friend.nombre || request.friend.username || `Usuario #${request.friend.display_id}`}</p>
                    <p className="font-bold text-black/50 text-sm">#{request.friend.display_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="bg-[#BFFF00] text-black border-2 border-black hover:bg-[#a6e600] font-black uppercase rounded-lg shadow-[2px_2px_0_0_#000] flex-1 sm:flex-none"
                    onClick={() => respondToRequest(request.id, true)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    className="bg-[#FF5C5C] text-black border-2 border-black hover:bg-[#e64c4c] font-black uppercase rounded-lg shadow-[2px_2px_0_0_#000] flex-1 sm:flex-none"
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
        <TabsList className="grid w-full grid-cols-2 bg-gray-200 p-1 border-4 border-black rounded-xl h-auto">
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 rounded-lg text-black transition-all">
            <Trophy className="w-5 h-5 mr-2" strokeWidth={2.5} />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="friends" className="data-[state=active]:bg-white data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0_0_#000] font-black uppercase py-3 rounded-lg text-black transition-all">
            <Users className="w-5 h-5 mr-2" strokeWidth={2.5} />
            Lista de Amigos
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          {/* Leaderboard Type Selector */}
          <div className="flex flex-wrap gap-3 p-4 bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl">
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
                  "font-black uppercase border-2 border-black rounded-lg transition-all h-10",
                  leaderboardType === key 
                    ? `bg-[${color}] text-black shadow-[2px_2px_0_0_#000]` 
                    : "bg-white text-black hover:bg-gray-100 hover:shadow-[2px_2px_0_0_#000] hover:translate-y-[-2px]"
                )}
                style={leaderboardType === key ? { backgroundColor: color } : {}}
              >
                <Icon className="w-4 h-4 mr-2" strokeWidth={3} />
                {label}
              </Button>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-black font-bold uppercase">Cargando...</div>
            ) : friendStats.length === 0 ? (
              <div className="p-12 text-center text-black/50">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" strokeWidth={2} />
                <p className="font-black uppercase text-xl">Agrega amigos para ver el ranking</p>
              </div>
            ) : (
              <div className="divide-y-4 divide-black">
                {getSortedStats().map((stat, index) => {
                  const isMe = stat.user_id === user?.id;
                  const position = index + 1;

                  return (
                    <div
                      key={stat.user_id}
                      className={cn(
                        "flex items-center justify-between p-4 sm:p-6 transition-colors",
                        isMe && "bg-[#BFFF00]/30",
                        position === 1 && !isMe && "bg-[#FFD700]/30",
                        position === 2 && !isMe && "bg-gray-200",
                        position === 3 && !isMe && "bg-[#FF9B71]/30"
                      )}
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        {/* Position */}
                        <div className={cn(
                          "w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center font-black text-lg shadow-[2px_2px_0_0_#000]",
                          position === 1 ? "bg-[#FFD700] text-black" :
                          position === 2 ? "bg-gray-300 text-black" :
                          position === 3 ? "bg-[#FF9B71] text-black" :
                          "bg-white text-black"
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
                            <p className="font-black uppercase text-lg leading-none">
                              {stat.profile.nombre || stat.profile.username || `Usuario #${stat.profile.display_id}`}
                            </p>
                            {/* @ts-ignore */}
                            {(stat.profile as any).active_badge === 'badge_supporter' && (
                              <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)]" />
                            )}
                            {isMe && <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded font-black uppercase">Tú</span>}
                          </div>
                          <p className="font-bold text-black/60 uppercase text-xs">Nivel {stat.level}</p>
                        </div>
                      </div>

                      {/* Stat Value */}
                      <div className="flex items-center gap-2 text-right">
                        <span className={cn(
                          "font-black text-xl sm:text-2xl",
                          position === 1 && "text-[#d1b000]"
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-black/50" strokeWidth={3} />
            <Input
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-white border-4 border-black rounded-xl font-bold text-lg shadow-[4px_4px_0_0_#000] focus-visible:ring-0 focus-visible:border-black focus-visible:shadow-[2px_2px_0_0_#000]"
            />
          </div>

          {/* Friends Grid */}
          {loading ? (
            <div className="p-8 text-center font-black uppercase text-black">Cargando...</div>
          ) : friends.length === 0 ? (
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-black/30" strokeWidth={2} />
              <p className="font-black text-black text-xl uppercase mb-6">Aún no tienes amigos</p>
              <Button 
                onClick={() => setAddFriendOpen(true)}
                className="bg-[#BFFF00] text-black border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-[#a6e600] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_#000] transition-all font-black uppercase h-12 rounded-lg text-base"
              >
                <UserPlus className="w-5 h-5 mr-2" strokeWidth={3} />
                Agregar tu primer amigo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {friends
                .filter(f =>
                  !searchQuery ||
                  f.friend.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  f.friend.display_id.toString().includes(searchQuery)
                )
                .map((friendship) => {
                  const stat = friendStats.find(s => s.user_id === friendship.friend.user_id);

                  return (
                    <div key={friendship.id} className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#000] transition-all flex flex-col group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 border-2 border-black rounded-lg bg-[#C688EB] flex items-center justify-center text-black font-black text-2xl shadow-[2px_2px_0_0_#000] group-hover:rotate-6 transition-transform">
                            {friendship.friend.nombre?.[0]?.toUpperCase() || friendship.friend.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-lg uppercase leading-tight truncate max-w-[120px]" title={friendship.friend.nombre || friendship.friend.username || `Usuario #${friendship.friend.display_id}`}>
                                {friendship.friend.nombre || friendship.friend.username || `Usuario #${friendship.friend.display_id}`}
                              </p>
                              {/* @ts-ignore */}
                              {(friendship.friend as any).active_badge === 'badge_supporter' && (
                                <Crown className="w-4 h-4 text-[#FFD700] fill-[#FFD700] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] flex-shrink-0" />
                              )}
                            </div>
                            <p className="font-bold text-black/50 text-sm mt-0.5">#{friendship.friend.display_id}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-black bg-white border-2 border-black rounded-lg hover:bg-[#FF5C5C] hover:text-black shadow-[2px_2px_0_0_#000] transition-colors h-8 w-8"
                          onClick={() => removeFriend(friendship.id)}
                          title="Eliminar amigo"
                        >
                          <UserX className="w-4 h-4" strokeWidth={2.5} />
                        </Button>
                      </div>

                      {stat && (
                        <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t-4 border-black/10">
                          <div className="flex flex-col gap-1 items-center bg-gray-100 p-2 rounded-lg border-2 border-black shadow-[1px_1px_0_0_#000]">
                            <Zap className="w-4 h-4 text-[#FFD700]" strokeWidth={3} />
                            <span className="font-black text-[10px] uppercase">Lvl {stat.level}</span>
                          </div>
                          <div className="flex flex-col gap-1 items-center bg-gray-100 p-2 rounded-lg border-2 border-black shadow-[1px_1px_0_0_#000]">
                            <span className="font-black text-[10px] uppercase text-[#00E5FF] drop-shadow-[1px_1px_0_rgba(0,0,0,1)] text-center">XP</span>
                            <span className="font-black text-[10px] uppercase">{stat.weekly_xp}</span>
                          </div>
                          <div className="flex flex-col gap-1 items-center bg-gray-100 p-2 rounded-lg border-2 border-black shadow-[1px_1px_0_0_#000]">
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
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl overflow-hidden mt-8">
              <div className="bg-gray-200 border-b-4 border-black p-4">
                <h3 className="font-black text-black uppercase text-lg">Solicitudes Enviadas ({sentRequests.length})</h3>
              </div>
              <div className="p-4 space-y-3">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-white border-2 border-black shadow-[2px_2px_0_0_#000] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border-2 border-black bg-gray-200 flex items-center justify-center font-black">
                        {request.friend.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-black uppercase">{request.friend.nombre || `Usuario #${request.friend.display_id}`}</span>
                    </div>
                    <span className="bg-[#FFD700] text-black border-2 border-black px-3 py-1 rounded text-xs font-black uppercase shadow-[1px_1px_0_0_#000]">
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
