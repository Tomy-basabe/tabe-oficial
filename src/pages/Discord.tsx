import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { DiscordServerList } from "@/components/discord/DiscordServerList";
import { DiscordChannelSidebar } from "@/components/discord/DiscordChannelSidebar";
import { DiscordTextChannel } from "@/components/discord/DiscordTextChannel";
import { DiscordVoiceChannel } from "@/components/discord/DiscordVoiceChannel";
import { Loader2 } from "lucide-react";

export default function Discord() {
  const discord = useDiscordVoice();
  const {
    servers,
    currentServer,
    channels,
    currentChannel,
    members,
    voiceParticipants,
    allVoiceParticipants,
    messages,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isDeafened,
    isScreenSharing,
    isSpeaking,
    speakingUsers,
    typingUsers,
    inVoiceChannel,
    setCurrentServer,
    createServer,
    deleteServer,
    leaveServer,
    createChannel,
    deleteChannel,
    setCurrentChannel,
    sendMessage,
    sendTypingIndicator,
    inviteUser,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleAudio,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    loading,
    createInvite,
    joinServerByCode,
    video // Destructure video object
  } = discord;

  if (loading && servers.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden relative selection:bg-primary/30 text-foreground font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

      <DiscordServerList
        servers={servers}
        currentServer={currentServer}
        onSelectServer={setCurrentServer}
        onCreateServer={createServer}
        onDeleteServer={deleteServer}
        onLeaveServer={leaveServer}
        onJoinByCode={joinServerByCode}
        onCreateInvite={createInvite}
        hasCurrentServer={!!currentServer}
      />

      {currentServer ? (
        <div className="flex-1 flex overflow-hidden">
          <DiscordChannelSidebar
            server={currentServer}
            channels={channels}
            currentChannel={currentChannel}
            members={members}
            voiceParticipants={voiceParticipants}
            allVoiceParticipants={allVoiceParticipants}
            speakingUsers={speakingUsers}
            onSelectChannel={setCurrentChannel}
            onCreateChannel={createChannel}
            onDeleteChannel={deleteChannel}
            onInviteUser={inviteUser}
            inVoiceChannel={inVoiceChannel}
            currentVoiceChannel={inVoiceChannel && currentChannel?.type === 'voice' ? currentChannel : null}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={video.isVideoEnabled} // Use video hook
            isDeafened={isDeafened}
            isSpeaking={isSpeaking}
            onToggleAudio={toggleAudio}
            onToggleDeafen={toggleDeafen}
            onLeaveVoice={leaveVoiceChannel}
          />

          <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
            {/* Main Content Area Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '20px 20px' }}>
            </div>

            {currentChannel?.type === "text" ? (
              <DiscordTextChannel
                channel={currentChannel}
                messages={messages}
                currentUser={discord.members.find(m => m.user_id === discord.members[0]?.user_id) || { id: "me", role: "member", user_id: "me", server_id: "", joined_at: "" }}
                members={members}
                onSendMessage={sendMessage}
                onTyping={sendTypingIndicator}
                typingUsers={typingUsers}
              />
            ) : currentChannel?.type === "voice" ? (
              <DiscordVoiceChannel
                channel={currentChannel}
                localStream={video.localVideoStream} // Use video hook
                remoteStreams={video.remoteVideoStreams} // Use video hook
                voiceParticipants={voiceParticipants}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={video.isVideoEnabled} // Use video hook
                isScreenSharing={isScreenSharing}
                isDeafened={isDeafened}
                onToggleAudio={toggleAudio}
                onToggleVideo={video.toggleVideo} // Use video hook
                onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
                onLeaveChannel={leaveVoiceChannel}
                speakingUsers={speakingUsers}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-muted/30" />
                </div>
                <p>Selecciona un canal para comenzar</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="relative z-10 max-w-md">
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(var(--primary),0.3)] animate-float">
              <img src="/discord-icon.svg" alt="Discord" className="w-12 h-12 opacity-80" onError={(e) => {
                e.currentTarget.style.display = 'none';
              }} />
            </div>
            <h2 className="text-3xl font-bold font-orbitron mb-4 text-primary">Bienvenido a tu Espacio</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Selecciona un servidor de la izquierda o crea uno nuevo para empezar a chatear y conectar con tu comunidad.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground/60">
              <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                <span className="block text-primary font-bold mb-1">Voz y Video</span>
                Conéctate en tiempo real
              </div>
              <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                <span className="block text-primary font-bold mb-1">Comunidad</span>
                Organiza tus canales
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
