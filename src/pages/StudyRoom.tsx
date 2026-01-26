import { useState, useEffect, useCallback } from "react";
import { useStudyRoom } from "@/hooks/useStudyRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import { RoomLobby } from "@/components/study-room/RoomLobby";
import { VideoGrid } from "@/components/study-room/VideoGrid";
import { RoomControls } from "@/components/study-room/RoomControls";
import { ParticipantsList } from "@/components/study-room/ParticipantsList";
import { StudyTimer } from "@/components/study-room/StudyTimer";
import { RoomChat } from "@/components/study-room/RoomChat";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudyRoom() {
  const { user } = useAuth();
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(false);
  
  const {
    activeRooms,
    currentRoom,
    participants,
    myParticipant,
    subjects,
    loading,
    sessionStartTime,
    createRoom,
    joinRoom,
    leaveRoom,
    updateMyState,
  } = useStudyRoom();

  const {
    localStream,
    displayStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    initializeMedia,
    joinSignalingChannel,
    leaveSignalingChannel,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(currentRoom?.id || null);

  // Initialize media and join signaling when entering a room
  useEffect(() => {
    if (currentRoom && !localStream) {
      const setup = async () => {
        const stream = await initializeMedia();
        if (stream) {
          await joinSignalingChannel(stream);
        }
      };
      setup();
    }
  }, [currentRoom, localStream, initializeMedia, joinSignalingChannel]);

  // Handle room creation
  const handleCreateRoom = async (name: string, subjectId?: string) => {
    return await createRoom(name, subjectId);
  };

  // Handle room join
  const handleJoinRoom = async (roomId: string, subjectId?: string) => {
    return await joinRoom(roomId, subjectId);
  };

  // Handle leaving room
  const handleLeaveRoom = async () => {
    leaveSignalingChannel();
    await leaveRoom();
  };

  // Handle audio toggle
  const handleToggleAudio = useCallback(() => {
    toggleAudio();
    updateMyState({ is_muted: isAudioEnabled });
  }, [toggleAudio, updateMyState, isAudioEnabled]);

  // Handle video toggle
  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    updateMyState({ is_camera_off: isVideoEnabled });
  }, [toggleVideo, updateMyState, isVideoEnabled]);

  // Handle screen share toggle
  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      updateMyState({ is_sharing_screen: false });
    } else {
      const success = await startScreenShare();
      if (success) {
        updateMyState({ is_sharing_screen: true });
      }
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare, updateMyState]);

  // Handle subject change
  const handleSubjectChange = useCallback((subjectId: string | null) => {
    updateMyState({ subject_id: subjectId });
  }, [updateMyState]);

  // If not in a room, show lobby
  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-display font-bold gradient-text">
            Sala de Estudio
          </h1>
          <p className="text-muted-foreground mt-1">
            Estudia con tus amigos en videollamada
          </p>
        </div>
        <RoomLobby
          activeRooms={activeRooms}
          subjects={subjects}
          loading={loading}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      </div>
    );
  }

  // In a room - show video call interface
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div>
          <h1 className="font-semibold">{currentRoom.name}</h1>
          <p className="text-xs text-muted-foreground">
            {connectionState === "connected" 
              ? `${participants.length} participante${participants.length !== 1 ? "s" : ""}` 
              : "Conectando..."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowParticipants(!showParticipants)}
          className="md:hidden"
        >
          <Users className="w-4 h-4" />
        </Button>
      </div>

      {/* Study Timer */}
      <StudyTimer
        sessionStartTime={sessionStartTime}
        subjects={subjects}
        currentSubjectId={myParticipant?.subject_id || null}
        onSubjectChange={handleSubjectChange}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 flex flex-col min-w-0">
          <VideoGrid
            displayStream={displayStream}
            remoteStreams={remoteStreams}
            participants={participants}
            currentUserId={user?.id || ""}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
          />
        </div>

        {/* Participants sidebar - desktop */}
        <div className={cn(
          "hidden md:flex transition-all duration-300",
          showParticipants ? "w-64" : "w-0"
        )}>
          {showParticipants && (
            <ParticipantsList
              participants={participants}
              subjects={subjects}
              hostId={currentRoom.host_id}
            />
          )}
        </div>

        {/* Toggle sidebar button */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => setShowParticipants(!showParticipants)}
        >
          {showParticipants ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Controls */}
      <RoomControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Chat */}
      <RoomChat
        roomId={currentRoom.id}
        isOpen={showChat}
        onToggle={() => setShowChat(!showChat)}
      />

      {/* Mobile participants drawer */}
      {showParticipants && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Participantes</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowParticipants(false)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <ParticipantsList
              participants={participants}
              subjects={subjects}
              hostId={currentRoom.host_id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
