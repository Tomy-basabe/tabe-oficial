import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Video, VideoOff, Monitor, Crown } from "lucide-react";
import type { RoomParticipant, Subject } from "@/hooks/useStudyRoom";
import { cn } from "@/lib/utils";

interface ParticipantsListProps {
  participants: RoomParticipant[];
  subjects: Subject[];
  hostId: string;
}

export function ParticipantsList({ participants, subjects, hostId }: ParticipantsListProps) {
  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return "Sin materia";
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.nombre : "Sin materia";
  };

  return (
    <div className="w-64 bg-card/50 border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">
          Participantes ({participants.length})
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {participants.map((participant) => {
            const isHost = participant.user_id === hostId;
            const displayName = participant.profile?.nombre || participant.profile?.username || "Usuario";
            const initials = displayName.slice(0, 2).toUpperCase();
            
            return (
              <div
                key={participant.id}
                className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={participant.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {displayName}
                      </span>
                      {isHost && (
                        <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {getSubjectName(participant.subject_id)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn(
                    "p-1 rounded",
                    participant.is_muted ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                  )}>
                    {participant.is_muted ? (
                      <MicOff className="w-3 h-3" />
                    ) : (
                      <Mic className="w-3 h-3" />
                    )}
                  </div>
                  <div className={cn(
                    "p-1 rounded",
                    participant.is_camera_off ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                  )}>
                    {participant.is_camera_off ? (
                      <VideoOff className="w-3 h-3" />
                    ) : (
                      <Video className="w-3 h-3" />
                    )}
                  </div>
                  {participant.is_sharing_screen && (
                    <Badge variant="secondary" className="text-xs py-0">
                      <Monitor className="w-3 h-3 mr-1" />
                      Pantalla
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
