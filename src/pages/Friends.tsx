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
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-neon-cyan" />
            Amigos
          </h1>
          <p className="text-muted-foreground mt-1">
            Compite con tus amigos y mide tu progreso
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* My ID Card */}
          <Card className="card-gamer px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Mi ID: </span>
                <span className="font-mono font-bold text-neon-cyan">
                  #{myProfile?.display_id || '...'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyId}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </Card>

          {/* Add Friend Button */}
          <Dialog open={addFriendOpen} onOpenChange={setAddFriendOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-neon-cyan to-neon-purple">
                <UserPlus className="w-4 h-4 mr-2" />
                Agregar Amigo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Agregar Amigo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Ingresa el ID o username de tu amigo
                  </label>
                  <Input
                    placeholder="Ej: 12345 o @username"
                    value={friendIdentifier}
                    onChange={(e) => setFriendIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                  />
                </div>
                <Button
                  className="w-full"
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
      <Card className="card-gamer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-muted-foreground">Tu username: </span>
              {myProfile?.username ? (
                <span className="font-semibold">@{myProfile.username}</span>
              ) : (
                <span className="text-muted-foreground italic">No configurado</span>
              )}
            </div>
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="nuevo_username"
                  className="w-40"
                />
                <Button size="sm" onClick={handleUpdateUsername}>Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingUsername(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditingUsername(true)}>
                {myProfile?.username ? "Cambiar" : "Configurar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="card-gamer border-neon-gold/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-neon-gold" />
              Solicitudes Pendientes ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-background font-bold">
                    {request.friend.nombre?.[0]?.toUpperCase() || request.friend.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{request.friend.nombre || request.friend.username || `Usuario #${request.friend.display_id}`}</p>
                    <p className="text-sm text-muted-foreground">#{request.friend.display_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => respondToRequest(request.id, true)}
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToRequest(request.id, false)}
                  >
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="friends">
            <Users className="w-4 h-4 mr-2" />
            Lista de Amigos
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          {/* Leaderboard Type Selector */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'xp', label: 'XP Semanal', icon: Zap },
              { key: 'pomodoro', label: 'Horas Pomodoro', icon: Clock },
              { key: 'study', label: 'Horas Estudio', icon: Clock },
              { key: 'streak', label: 'Racha', icon: Flame }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={leaderboardType === key ? "default" : "outline"}
                size="sm"
                onClick={() => setLeaderboardType(key as typeof leaderboardType)}
                className={cn(
                  leaderboardType === key && "bg-gradient-to-r from-neon-cyan to-neon-purple"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>

          {/* Leaderboard */}
          <Card className="card-gamer">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : friendStats.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Agrega amigos para ver el ranking</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {getSortedStats().map((stat, index) => {
                    const isMe = stat.user_id === user?.id;
                    const position = index + 1;

                    return (
                      <div
                        key={stat.user_id}
                        className={cn(
                          "flex items-center justify-between p-4 transition-colors",
                          isMe && "bg-neon-cyan/10",
                          position === 1 && "bg-gradient-to-r from-neon-gold/10 to-transparent"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {/* Position */}
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                            position === 1 && "bg-neon-gold text-background",
                            position === 2 && "bg-gray-400 text-background",
                            position === 3 && "bg-amber-700 text-background",
                            position > 3 && "bg-secondary text-muted-foreground"
                          )}>
                            {position === 1 ? <Crown className="w-4 h-4" /> : position}
                          </div>

                          {/* Avatar */}
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                            isMe
                              ? "bg-gradient-to-br from-neon-cyan to-neon-purple text-background"
                              : "bg-secondary text-foreground"
                          )}>
                            {stat.profile.nombre?.[0]?.toUpperCase() || stat.profile.username?.[0]?.toUpperCase() || '?'}
                          </div>

                          {/* Name */}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                              </p>
                              {stat.profile.active_badge === 'badge_supporter' && (
                                <Crown className="w-3.5 h-3.5 text-neon-gold fill-neon-gold animate-pulse shadow-sm" />
                              )}
                              {isMe && <Badge variant="secondary" className="text-xs">Tú</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">Nivel {stat.level}</p>
                          </div>
                        </div>

                        {/* Stat Value */}
                        <div className="flex items-center gap-2 text-right">
                          {getLeaderboardIcon()}
                          <span className={cn(
                            "font-bold text-lg",
                            position === 1 && "text-neon-gold"
                          )}>
                            {getStatValue(stat)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Friends List Tab */}
        <TabsContent value="friends" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar amigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Friends Grid */}
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : friends.length === 0 ? (
            <Card className="card-gamer">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">Aún no tienes amigos</p>
                <Button onClick={() => setAddFriendOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Agregar tu primer amigo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <Card key={friendship.id} className="card-gamer hover:glow-cyan transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-background font-bold text-lg">
                              {friendship.friend.nombre?.[0]?.toUpperCase() || friendship.friend.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {friendship.friend.nombre || friendship.friend.username || `Usuario #${friendship.friend.display_id}`}
                              </p>
                              {friendship.friend.active_badge === 'badge_supporter' && (
                                <Crown className="w-3.5 h-3.5 text-neon-gold fill-neon-gold" />
                              )}
                              <p className="text-sm text-muted-foreground">#{friendship.friend.display_id}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeFriend(friendship.id)}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>

                        {stat && (
                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Zap className="w-4 h-4 text-neon-gold" />
                              <span>Nivel {stat.level}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Flame className="w-4 h-4 text-orange-500" />
                              <span>{stat.current_streak} días</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <Card className="card-gamer mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Solicitudes Enviadas ({sentRequests.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        {request.friend.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span>{request.friend.nombre || `Usuario #${request.friend.display_id}`}</span>
                    </div>
                    <Badge variant="secondary">Pendiente</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
