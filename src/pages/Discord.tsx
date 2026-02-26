import { useState } from "react";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { DiscordServerList } from "@/components/discord/DiscordServerList";
import { DiscordChannelSidebar } from "@/components/discord/DiscordChannelSidebar";
import { DiscordTextChannel } from "@/components/discord/DiscordTextChannel";
import { DiscordVoiceChannel } from "@/components/discord/DiscordVoiceChannel";
import { Loader2, ArrowLeft, Hash, Volume2 } from "lucide-react";

// Mobile view states: which panel is shown on small screens
type MobileView = "servers" | "channels" | "main";

export default function Discord() {
  const discord = useDiscordVoice();
  const [mobileView, setMobileView] = useState<MobileView>("servers");

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
    toggleVideo,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    loading,
    createInvite,
    joinServerByCode,
    cameras,
    selectedCameraId,
    switchCamera,
    screenStream,
    remoteScreenStreams,
  } = discord;

  // When selecting a server on mobile, auto-navigate to channels
  const handleSelectServer = (server: any) => {
    setCurrentServer(server);
    if (server) setMobileView("channels");
  };

  // When selecting a channel on mobile, auto-navigate to main content
  const handleSelectChannel = (channel: any) => {
    setCurrentChannel(channel);
    if (channel) setMobileView("main");
  };

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

      {/* === SERVER LIST === */}
      {/* Desktop: always visible. Mobile: only when mobileView === "servers" */}
      <div className={`
        shrink-0 z-50
        md:block
        ${mobileView === "servers" ? "block w-full" : "hidden"}
      `}>
        <div className="md:w-auto w-full h-full">
          <DiscordServerList
            servers={servers}
            currentServer={currentServer}
            onSelectServer={handleSelectServer}
            onCreateServer={createServer}
            onDeleteServer={deleteServer}
            onLeaveServer={leaveServer}
            onJoinByCode={joinServerByCode}
            onCreateInvite={createInvite}
            hasCurrentServer={!!currentServer}
          />
        </div>
      </div>

      {currentServer ? (
        <div className={`
          flex-1 flex overflow-hidden
          ${mobileView === "servers" ? "hidden md:flex" : "flex"}
        `}>
          {/* === CHANNEL SIDEBAR === */}
          {/* Desktop: always visible. Mobile: only when mobileView === "channels" */}
          <div className={`
            shrink-0
            md:block md:w-60
            ${mobileView === "channels" ? "block w-full" : "hidden"}
          `}>
            {/* Mobile back button to servers */}
            <div className="md:hidden flex items-center gap-2 h-12 px-3 border-b border-border bg-card/30">
              <button
                onClick={() => setMobileView("servers")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm truncate">{currentServer.name}</span>
            </div>
            <div className="md:h-full h-[calc(100%-48px)]">
              <DiscordChannelSidebar
                server={currentServer}
                channels={channels}
                currentChannel={currentChannel}
                members={members}
                voiceParticipants={voiceParticipants}
                allVoiceParticipants={allVoiceParticipants}
                speakingUsers={speakingUsers}
                onSelectChannel={handleSelectChannel}
                onCreateChannel={createChannel}
                onDeleteChannel={deleteChannel}
                onInviteUser={inviteUser}
                inVoiceChannel={inVoiceChannel}
                currentVoiceChannel={inVoiceChannel && currentChannel?.type === 'voice' ? currentChannel : null}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isDeafened={isDeafened}
                isSpeaking={isSpeaking}
                onToggleAudio={toggleAudio}
                onToggleDeafen={toggleDeafen}
                onLeaveVoice={leaveVoiceChannel}
              />
            </div>
          </div>

          {/* === MAIN CONTENT === */}
          {/* Desktop: always visible. Mobile: only when mobileView === "main" */}
          <div className={`
            flex-1 flex flex-col bg-background relative overflow-hidden
            ${mobileView === "main" ? "flex" : "hidden md:flex"}
          `}>
            {/* Mobile header with back button */}
            <div className="md:hidden flex items-center gap-2 h-12 px-3 border-b border-border bg-card/30 shrink-0">
              <button
                onClick={() => setMobileView("channels")}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {currentChannel && (
                <div className="flex items-center gap-2 truncate">
                  {currentChannel.type === "text" ? (
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-bold text-sm truncate">{currentChannel.name}</span>
                </div>
              )}
            </div>

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
                localStream={localStream}
                remoteStreams={remoteStreams}
                voiceParticipants={voiceParticipants}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isScreenSharing={isScreenSharing}
                isDeafened={isDeafened}
                cameras={cameras}
                selectedCameraId={selectedCameraId}
                onToggleAudio={toggleAudio}
                onToggleVideo={toggleVideo}
                onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
                onLeaveChannel={leaveVoiceChannel}
                onSwitchCamera={switchCamera}
                speakingUsers={speakingUsers}
                screenStream={screenStream}
                remoteScreenStreams={remoteScreenStreams}
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
        <div className={`
          flex-1 flex flex-col items-center justify-center bg-background text-foreground p-8 text-center relative overflow-hidden
          ${mobileView === "servers" ? "hidden md:flex" : "flex"}
        `}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="relative z-10 max-w-md">
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(var(--primary),0.3)] animate-float">
              <img src="/favicon.svg" alt="Comunidad" className="w-12 h-12 opacity-80" onError={(e) => {
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
