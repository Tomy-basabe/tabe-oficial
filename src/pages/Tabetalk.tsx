import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { DiscordServerList } from "@/components/discord/DiscordServerList";
import { DiscordChannelSidebar } from "@/components/discord/DiscordChannelSidebar";
import { DiscordTextChannel } from "@/components/discord/DiscordTextChannel";
import { DiscordVoiceChannel } from "@/components/discord/DiscordVoiceChannel";
import { ArrowLeft, Hash, Volume2, Plus, Sparkles, Video, MonitorUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

// Mobile view states: which panel is shown on small screens
type MobileView = "servers" | "channels" | "main";

export default function Tabetalk() {
  const navigate = useNavigate();
  const discord = useDiscordVoice();
  const [mobileView, setMobileView] = useState<MobileView>("servers");
  const [showCreateOrJoinModal, setShowCreateOrJoinModal] = useState(false);

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
    updateServer,
    getServerInviteCode,
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
    remoteMediaStates,
  } = discord;

  // Desconexión limpia de llamada WebRTC y retorno al Dashboard
  const handleGoBack = async () => {
    if (inVoiceChannel) {
      try {
        await leaveVoiceChannel();
      } catch (err) {
        console.error("Error al desconectar canal de voz al salir de Tabetalk:", err);
      }
    }
    navigate("/dashboard");
  };

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
    return <LoadingScreen message="Cargando Tabetalk..." submessage="Conectando salas de voz y estudio..." />;
  }

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden relative selection:bg-primary/30 text-foreground font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

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
            onGoBack={handleGoBack}
            openModal={showCreateOrJoinModal}
            onOpenModalChange={setShowCreateOrJoinModal}
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
                onDeleteServer={deleteServer}
                onLeaveServer={leaveServer}
                onUpdateServer={updateServer}
                onGetServerInviteCode={getServerInviteCode}
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
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
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
                remoteMediaStates={remoteMediaStates}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4 p-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg shadow-black/10">
                  <Hash className="w-10 h-10 text-primary/70" />
                </div>
                <div className="max-w-sm">
                  <h3 className="text-lg font-bold text-foreground mb-1">Ningún canal seleccionado</h3>
                  <p className="text-sm text-muted-foreground">
                    Elige un canal de texto o voz en la barra lateral izquierda para unirte a la conversación.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* === EMPTY STATE / PANTALLA DE BIENVENIDA === */
        <div className={`
          flex-1 flex flex-col items-center justify-center bg-background text-foreground p-6 sm:p-12 text-center relative overflow-hidden
          ${mobileView === "servers" ? "hidden md:flex" : "flex"}
        `}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/15 via-background to-background pointer-events-none" />
          
          {/* Subtle Grid Accent */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />

          <div className="relative z-10 max-w-lg flex flex-col items-center">
            {/* Logo con Glow ambiental */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-75 animate-pulse" />
              <div className="relative w-24 h-24 rounded-3xl bg-card/80 border border-primary/30 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-primary/20">
                <img 
                  src="/tabe-talk.png" 
                  alt="Tabetalk" 
                  className="w-16 h-16 object-contain drop-shadow" 
                  onError={(e) => { e.currentTarget.src = "/logo.png"; }} 
                />
              </div>
            </div>

            {/* Título y Descripción */}
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-foreground">
              ¡Bienvenido a <span className="text-primary font-orbitron">Tabetalk</span>!
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md leading-relaxed">
              Selecciona un servidor o conéctate con tus compañeros para estudiar, hablar y compartir pantalla en tiempo real.
            </p>

            {/* Botón Destacado */}
            <Button
              size="lg"
              onClick={() => setShowCreateOrJoinModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all flex items-center gap-2.5 text-base mb-10"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              Crear o Unirse a un Servidor
            </Button>

            {/* Feature Cards Informativas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
              <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm hover:border-primary/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                  <Video className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground mb-1">Voz & Video P2P</h4>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Transmisión cifrada punto a punto sin retardos ni intermediarios.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm hover:border-primary/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                  <MonitorUp className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground mb-1">Pantalla Compartida</h4>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Comparte tus diapositivas, código o apuntes en directo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm hover:border-primary/40 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2.5">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground mb-1">Comunidad Activa</h4>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Crea canales de texto dedicados para cada tema o materia.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
