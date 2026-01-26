import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Plus, Loader2, BookOpen } from "lucide-react";
import type { StudyRoom, Subject } from "@/hooks/useStudyRoom";

interface RoomLobbyProps {
  activeRooms: StudyRoom[];
  subjects: Subject[];
  loading: boolean;
  onCreateRoom: (name: string, subjectId?: string) => Promise<any>;
  onJoinRoom: (roomId: string, subjectId?: string) => Promise<boolean>;
}

export function RoomLobby({
  activeRooms,
  subjects,
  loading,
  onCreateRoom,
  onJoinRoom,
}: RoomLobbyProps) {
  const [roomName, setRoomName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    setIsCreating(true);
    await onCreateRoom(roomName, selectedSubject || undefined);
    setIsCreating(false);
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId);
    await onJoinRoom(roomId);
    setJoiningRoomId(null);
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null;
    return subjects.find(s => s.id === subjectId)?.nombre;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Create Room Section */}
      <Card className="card-gamer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Crear Sala de Estudio
          </CardTitle>
          <CardDescription>
            Crea una sala y tus amigos podrán unirse para estudiar juntos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Nombre de la sala</Label>
              <Input
                id="room-name"
                placeholder="Ej: Estudiando para el parcial..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Materia (opcional)</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin materia específica</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.codigo} - {subject.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleCreateRoom}
            disabled={!roomName.trim() || isCreating}
            className="w-full md:w-auto"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Video className="w-4 h-4 mr-2" />
            )}
            Crear Sala
          </Button>
        </CardContent>
      </Card>

      {/* Active Rooms Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Salas de Amigos Activas
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {activeRooms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No hay salas activas de tus amigos
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                ¡Crea una sala y compártela con tus amigos!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRooms.map((room) => {
              const hostName = room.host_profile?.nombre || room.host_profile?.username || "Usuario";
              const initials = hostName.slice(0, 2).toUpperCase();
              const subjectName = getSubjectName(room.subject_id);
              
              return (
                <Card key={room.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage src={room.host_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{room.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Host: {hostName}
                          </p>
                          {subjectName && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {subjectName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={joiningRoomId === room.id}
                        size="sm"
                      >
                        {joiningRoomId === room.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Unirse"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
