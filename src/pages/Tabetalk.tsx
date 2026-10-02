import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { DiscordServerList } from "@/components/discord/DiscordServerList";
import { DiscordChannelSidebar } from "@/components/discord/DiscordChannelSidebar";
import { DiscordTextChannel } from "@/components/discord/DiscordTextChannel";
import { DiscordVoiceChannel } from "@/components/discord/DiscordVoiceChannel";
import { 
  ArrowLeft, 
  Hash, 
  Volume2, 
  Plus, 
  Video, 
  MonitorUp, 
  Users, 
  Sparkles, 
  Zap, 
  Flame, 
  Radio, 
  CheckCircle2, 
  MessageSquare,
  KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mobile view states: which panel is shown on small screens
type MobileView = "servers" | "channels" | "main";

type FeatureCardType = "voice" | "screen" | "community" | null;

export default function Tabetalk() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const discord = useDiscordVoice();
  const [mobileView, setMobileView] = useState<MobileView>("main");
  const [showCreateOrJoinModal, setShowCreateOrJoinModal] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<"create" | "join">("create");
  const [prefillInviteCode, setPrefillInviteCode] = useState<string>("");
  const [activeFeatureModal, setActiveFeatureModal] = useState<FeatureCardType>(null);

  // Auto-detectar cÃ³digo de invitaciÃ³n en la URL (?invite=XYZ)
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      setPrefillInviteCode(inviteParam.trim());
      setModalDefaultTab("join");
      setShowCreateOrJoinModal(true);
    }
  }, [searchParams]);

  const handleOpenCreateModal = () => {
    setModalDefaultTab("create");
    setShowCreateOrJoinModal(true);
  };

  const handleOpenJoinModal = () => {
    setModalDefaultTab("join");
    setShowCreateOrJoinModal(true);
  };

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
    mics,
    selectedMicId,
    switchMic,
    screenStream,
    remoteScreenStreams,
    remoteMediaStates,
  } = discord;

  // DesconexiÃ³n limpia de llamada WebRTC y retorno al Dashboard
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
    if (server) {
      setMobileView("channels");
    } else {
      setMobileView("main");
    }
  };

  // When selecting a channel on mobile, auto-navigate to main content
  const handleSelectChannel = (channel: any) => {
    setCurrentChannel(channel);
    if (channel) setMobileView("main");
  };

  // Al entrar a Tabetalk sin servidor seleccionado, asegurar vista principal activa
  useEffect(() => {
    if (!currentServer) {
      setMobileView("main");
    }
  }, [currentServer]);

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-background overflow-hidden relative selection:bg-primary/30 text-foreground font-sans">
      {/* Background Comic/Gaming Dot Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] pointer-events-none"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1.5px, transparent 0)', 
          backgroundSize: '24px 24px' 
        }}
      />

      {/* Ambient Radial Accent */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#FFE600]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* === SERVER LIST === */}
      {/* Desktop: barra lateral izquierda siempre visible. 
          Mobile: barra superior horizontal si estamos en Home/Welcome o cuando mobileView === "servers" */}
      <div className={`
        shrink-0 z-50
        md:block
        ${!currentServer 
          ? "block w-full md:w-auto" 
          : mobileView === "servers" 
            ? "block w-full" 
            : "hidden md:block"
        }
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
            defaultModalTab={modalDefaultTab}
            prefillInviteCode={prefillInviteCode}
          />
        </div>
      </div>

      {currentServer ? (
        <div className={`
          flex-1 flex overflow-hidden
          ${mobileView === "servers" ? "hidden md:flex" : "flex"}
        `}>
          {/* === CHANNEL SIDEBAR === */}
          <div className={`
            shrink-0
            md:block md:w-60
            ${mobileView === "channels" ? "block w-full" : "hidden"}
          `}>
            {/* Mobile back button to servers */}
            <div className="md:hidden flex items-center gap-2 h-12 px-3 border-b-2 border-black bg-card/60">
              <button
                onClick={() => setMobileView("servers")}
                className="p-1.5 rounded-lg border-2 border-black bg-[#FFE600] text-black shadow-[2px_2px_0px_#000] active:translate-x-0 active:translate-y-0 transition-all"
              >
                <ArrowLeft className="w-4 h-4 stroke-[3]" />
              </button>
              <span className="font-black text-sm truncate uppercase tracking-wider">{currentServer.name}</span>
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
                currentVoiceChannel={discord.currentVoiceChannel || (inVoiceChannel && currentChannel?.type === 'voice' ? currentChannel : null)}
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
          <div className={`
            flex-1 flex flex-col bg-background relative overflow-hidden
            ${mobileView === "main" ? "flex" : "hidden md:flex"}
          `}>
            {/* Mobile header with back button */}
            <div className="md:hidden flex items-center gap-2 h-12 px-3 border-b-2 border-black bg-card/60 shrink-0">
              <button
                onClick={() => setMobileView("channels")}
                className="p-1.5 rounded-lg border-2 border-black bg-[#FFE600] text-black shadow-[2px_2px_0px_#000] active:translate-x-0 active:translate-y-0 transition-all"
              >
                <ArrowLeft className="w-4 h-4 stroke-[3]" />
              </button>
              {currentChannel && (
                <div className="flex items-center gap-2 truncate">
                  {currentChannel.type === "text" ? (
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-black text-sm truncate uppercase">{currentChannel.name}</span>
                </div>
              )}
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
                mics={mics}
                selectedMicId={selectedMicId}
                onSwitchMic={switchMic}
                speakingUsers={speakingUsers}
                screenStream={screenStream}
                remoteScreenStreams={remoteScreenStreams}
                remoteMediaStates={remoteMediaStates}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <div className="max-w-md p-8 rounded-2xl bg-card border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#FFE600] border-2 border-black flex items-center justify-center mb-4 shadow-[3px_3px_0px_#000]">
                    <Hash className="w-8 h-8 text-black stroke-[2.5]" />
                  </div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-wide mb-2">
                    NingÃºn canal seleccionado
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    Elige un canal de texto o voz en el panel izquierdo para conversar o conectarte en llamada.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* === EMPTY STATE / PANTALLA DE BIENVENIDA NEOBRUTALISTA GAMING / CÃ“MIC SCROLLEABLE EN MÃ“VIL === */
        <div className="flex-1 w-full min-h-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 pb-24 sm:pb-12 flex flex-col items-center justify-start md:justify-center relative z-10 discord-scrollbar">
          {/* Estilos CSS nativos ligeros acelerados por hardware para animaciÃ³n cÃ³mic flotante */}
          <style>{`
            @keyframes comicFloatA {
              0%, 100% { transform: translate3d(0, 0px, 0) rotate(0deg); }
              50% { transform: translate3d(0, -9px, 0) rotate(4deg); }
            }
            @keyframes comicFloatB {
              0%, 100% { transform: translate3d(0, 0px, 0) rotate(0deg); }
              50% { transform: translate3d(0, 7px, 0) rotate(-4deg); }
            }
            @keyframes comicFloatC {
              0%, 100% { transform: translate3d(0, 0px, 0) rotate(0deg); }
              50% { transform: translate3d(0, -7px, 0) rotate(-6deg); }
            }
            .comic-float-a { animation: comicFloatA 5s ease-in-out infinite; will-change: transform; }
            .comic-float-b { animation: comicFloatB 6s ease-in-out infinite 0.7s; will-change: transform; }
            .comic-float-c { animation: comicFloatC 4.5s ease-in-out infinite 1.4s; will-change: transform; }
          `}</style>

          {/* Formas flotantes cÃ³mic / gaming decorativas de fondo (Zero network / Zero websocket) */}
          <div className="pointer-events-none z-0 absolute top-8 left-8 sm:top-10 sm:left-14 comic-float-a hidden sm:flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black shadow-[3px_3px_0px_#000] rotate-12 flex items-center justify-center text-black font-black text-sm">
              âœ¦
            </div>
          </div>

          <div className="pointer-events-none z-0 absolute top-24 left-20 sm:top-24 sm:left-28 comic-float-b hidden md:flex items-center justify-center">
            <span className="text-xl font-black text-[#00E5FF] drop-shadow-[2px_2px_0px_#000] select-none">
              âœš
            </span>
          </div>

          <div className="pointer-events-none z-0 absolute top-8 right-8 sm:top-10 sm:right-16 comic-float-b hidden sm:flex items-center justify-center">
            <div className="relative px-2.5 py-0.5 rounded-md bg-[#FFE600] text-black border-2 border-black shadow-[3px_3px_0px_#000] font-black text-[10px] uppercase tracking-wider -rotate-6">
              TABE!
              <div className="absolute -bottom-1 left-2 w-1.5 h-1.5 bg-[#FFE600] border-r-2 border-b-2 border-black rotate-45" />
            </div>
          </div>

          <div className="pointer-events-none z-0 absolute top-24 right-16 sm:top-24 sm:right-28 comic-float-c hidden md:flex items-center justify-center">
            <div className="w-7 h-7 rounded-md bg-[#FF2E93] border-2 border-black shadow-[2px_2px_0px_#000] -rotate-12 flex items-center justify-center text-white font-black text-xs">
              âœ§
            </div>
          </div>

          <div className="pointer-events-none z-0 absolute top-1/2 left-6 sm:left-10 -translate-y-1/2 comic-float-c hidden lg:flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF] border-2 border-black shadow-[3px_3px_0px_#000] rotate-6 flex items-center justify-center text-black font-black text-sm">
              âš¡
            </div>
          </div>

          <div className="pointer-events-none z-0 absolute top-1/2 right-6 sm:right-10 -translate-y-1/2 comic-float-a hidden lg:flex items-center justify-center">
            <div className="px-2 py-0.5 rounded-md bg-[#10B981] border-2 border-black shadow-[3px_3px_0px_#000] text-white font-black text-[9px] uppercase tracking-wider rotate-3">
              XP +50
            </div>
          </div>

          {/* Contenedor Central Escala Equilibrada y Scrolleable */}
          <div className="w-full max-w-4xl flex flex-col items-center text-center justify-center relative z-10 px-2 my-auto py-2 sm:py-6">
            
            {/* Top Retro Gaming Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFE600] text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000]">
                <Flame className="w-3 h-3 fill-black stroke-black" />
                ðŸ”¥ TABETALK V2.0
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#00E5FF] text-black font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000]">
                <Zap className="w-3 h-3 fill-black stroke-black" />
                âš¡ P2P DIRECTO
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FF2E93] text-white font-black text-[10px] sm:text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000]">
                ðŸŽ® CO-STUDY
              </span>
            </div>

            {/* Logo Arcade Neobrutalista Redimensionado */}
            <div className="relative mb-2.5 group cursor-pointer" onClick={handleOpenCreateModal}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFE600] border-3 border-black shadow-[4px_4px_0px_#000] sm:shadow-[5px_5px_0px_#000] flex items-center justify-center -rotate-2 group-hover:rotate-0 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[7px_7px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_#000] transition-all duration-200">
                <img 
                  src="/tabe-talk.png" 
                  alt="Tabetalk" 
                  className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow" 
                  onError={(e) => { e.currentTarget.src = "/logo.png"; }} 
                />
              </div>
              <div className="absolute -top-1.5 -right-1.5 bg-black text-[#FFE600] text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border border-black shadow-[1.5px_1.5px_0px_#000]">
                LIVE
              </div>
            </div>

            {/* TÃ­tulo Neobrutalista Equilibrado */}
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-foreground mb-2 leading-none">
              Â¡BIENVENIDO A{" "}
              <span className="inline-block bg-[#FFE600] text-black px-2.5 py-0.5 rounded-lg border-2 sm:border-3 border-black shadow-[3px_3px_0px_#000] rotate-1">
                TABETALK
              </span>
              !
            </h1>

            {/* SubtÃ­tulo / DescripciÃ³n Compacta */}
            <div className="max-w-md mx-auto mb-4 p-2.5 rounded-xl bg-card border-2 border-black shadow-[3px_3px_0px_#000]">
              <p className="text-muted-foreground text-xs sm:text-sm font-bold leading-normal">
                Selecciona un servidor o conÃ©ctate con tus compaÃ±eros para estudiar, encender tu cÃ¡mara y compartir pantalla sin lÃ­mites.
              </p>
            </div>

            {/* Botones Principales Arcade: Crear Servidor & Unirse con CÃ³digo */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-md mx-auto mb-5 sm:mb-6">
              <button
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#FFE600] hover:bg-[#FFE600]/95 text-black font-black uppercase text-xs sm:text-sm px-5 py-3 rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1.5px_1.5px_0px_#000] transition-all cursor-pointer group"
              >
                <div className="w-5 h-5 rounded-md bg-black text-[#FFE600] flex items-center justify-center group-hover:rotate-12 transition-transform shrink-0">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>CREAR SERVIDOR</span>
              </button>

              <button
                onClick={handleOpenJoinModal}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-[#00E5FF] hover:bg-[#00E5FF]/95 text-black font-black uppercase text-xs sm:text-sm px-5 py-3 rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1.5px_1.5px_0px_#000] transition-all cursor-pointer group"
              >
                <div className="w-5 h-5 rounded-md bg-black text-[#00E5FF] flex items-center justify-center group-hover:-rotate-12 transition-transform shrink-0">
                  <KeyRound className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>UNIRSE CON CÃ“DIGO</span>
              </button>
            </div>

            {/* 3 Cards Interactivas CÃ³mic / Gaming Neobrutalistas Compactas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
              
              {/* Card 1: Voz & Video P2P */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => setActiveFeatureModal("voice")}
                    className="p-3.5 sm:p-4 rounded-xl bg-card border-2 sm:border-3 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1.5px_1.5px_0px_#000] transition-all cursor-pointer text-left flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#00E5FF] text-black border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] group-hover:scale-105 transition-transform">
                          <Video className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-foreground border border-black">
                          âš¡ P2P DIRECTO
                        </span>
                      </div>
                      <h3 className="font-black text-xs sm:text-sm uppercase text-foreground mb-0.5 group-hover:text-primary transition-colors">
                        Voz & Video P2P
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground leading-snug line-clamp-2">
                        TransmisiÃ³n directa punto a punto entre navegadores sin lag ni intermediarios.
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-black text-primary uppercase">
                      <span>Explorar sala</span>
                      <span>â†’</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black text-white font-bold border-2 border-black shadow-[3px_3px_0px_#000]">
                  Click para ver detalles de llamada WebRTC
                </TooltipContent>
              </Tooltip>

              {/* Card 2: Pantalla Compartida */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => setActiveFeatureModal("screen")}
                    className="p-3.5 sm:p-4 rounded-xl bg-card border-2 sm:border-3 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1.5px_1.5px_0px_#000] transition-all cursor-pointer text-left flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FF2E93] text-white border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] group-hover:scale-105 transition-transform">
                          <MonitorUp className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FF2E93]/20 text-foreground border border-black">
                          ðŸŽ® CO-STUDY
                        </span>
                      </div>
                      <h3 className="font-black text-xs sm:text-sm uppercase text-foreground mb-0.5 group-hover:text-primary transition-colors">
                        Pantalla Compartida
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground leading-snug line-clamp-2">
                        Transmite diapositivas, cÃ³digo o apuntes en vivo en calidad HD a tus compaÃ±eros.
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-black text-primary uppercase">
                      <span>CÃ³mo transmitir</span>
                      <span>â†’</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black text-white font-bold border-2 border-black shadow-[3px_3px_0px_#000]">
                  Click para ver cÃ³mo compartir pantalla
                </TooltipContent>
              </Tooltip>

              {/* Card 3: Comunidad Activa */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    onClick={() => setActiveFeatureModal("community")}
                    className="p-3.5 sm:p-4 rounded-xl bg-card border-2 sm:border-3 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1.5px_1.5px_0px_#000] transition-all cursor-pointer text-left flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FFE600] text-black border-2 border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000] group-hover:scale-105 transition-transform">
                          <Users className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FFE600]/30 text-foreground border border-black">
                          ðŸ”¥ CANALES
                        </span>
                      </div>
                      <h3 className="font-black text-xs sm:text-sm uppercase text-foreground mb-0.5 group-hover:text-primary transition-colors">
                        Comunidad Activa
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground leading-snug line-clamp-2">
                        Canales de texto y voz organizados por materia, apuntes y grupos de estudio.
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-black text-primary uppercase">
                      <span>Unirse con cÃ³digo</span>
                      <span>â†’</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black text-white font-bold border-2 border-black shadow-[3px_3px_0px_#000]">
                  Click para unirse o crear un espacio
                </TooltipContent>
              </Tooltip>

            </div>
          </div>

          {/* Modal Interactivo de Cards Neobrutalistas */}
          <Dialog open={!!activeFeatureModal} onOpenChange={(open) => !open && setActiveFeatureModal(null)}>
            <DialogContent className="bg-card border-3 border-black text-foreground sm:max-w-md p-0 overflow-hidden shadow-[8px_8px_0px_#000]">
              <DialogHeader className="p-6 pb-4 bg-muted/30 border-b-2 border-black">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000] ${
                    activeFeatureModal === "voice" 
                      ? "bg-[#00E5FF] text-black" 
                      : activeFeatureModal === "screen" 
                        ? "bg-[#FF2E93] text-white" 
                        : "bg-[#FFE600] text-black"
                  }`}>
                    {activeFeatureModal === "voice" && <Video className="w-6 h-6 stroke-[2.5]" />}
                    {activeFeatureModal === "screen" && <MonitorUp className="w-6 h-6 stroke-[2.5]" />}
                    {activeFeatureModal === "community" && <Users className="w-6 h-6 stroke-[2.5]" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black uppercase text-foreground">
                      {activeFeatureModal === "voice" && "Llamada Directa P2P"}
                      {activeFeatureModal === "screen" && "Compartir Pantalla"}
                      {activeFeatureModal === "community" && "Comunidades y Canales"}
                    </DialogTitle>
                    <span className="text-xs font-black uppercase text-primary">
                      {activeFeatureModal === "voice" && "Voz y Video en Tiempo Real"}
                      {activeFeatureModal === "screen" && "Co-Study Colaborativo"}
                      {activeFeatureModal === "community" && "Salas de Estudio Tabe"}
                    </span>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-6 space-y-4">
                {activeFeatureModal === "voice" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      ConÃ©ctate a cualquier canal de voz en tus servidores para iniciar videollamadas con baja latencia gracias a la conexiÃ³n cifrada P2P con servidores STUN pÃºblicos.
                    </p>
                    <div className="space-y-2 text-xs font-bold">
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>Soporta mÃºltiples cÃ¡maras y cambio dinÃ¡mico</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>DetecciÃ³n de voz activa y silenciador instantÃ¡neo</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeFeatureModal === "screen" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      Dentro de una sala de voz, activa el botÃ³n de pantalla para compartir tus pestaÃ±as, apuntes de Notion o tu IDE de programaciÃ³n en directo.
                    </p>
                    <div className="space-y-2 text-xs font-bold">
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>Reemplazo dinÃ¡mico de cÃ¡mara a pantalla sin cortar la llamada</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>Audio del sistema integrado para compartir videos o presentaciones</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeFeatureModal === "community" && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                      Crea un servidor propio para tu cursada, grupo de trabajo o materias, o Ãºnete al de tus compaÃ±eros mediante un cÃ³digo alfanumÃ©rico rÃ¡pido.
                    </p>
                    <div className="space-y-2 text-xs font-bold">
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>Canales de texto separados para chats y archivos</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span>CÃ³digos de invitaciÃ³n Ãºnicos y gestiÃ³n segura de miembros</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t-2 border-black/10">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveFeatureModal(null)}
                    className="font-bold text-xs"
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      const type = activeFeatureModal;
                      setActiveFeatureModal(null);
                      if (type === "community") {
                        handleOpenJoinModal();
                      } else {
                        handleOpenCreateModal();
                      }
                    }}
                    className="bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition-all"
                  >
                    Crear o Unirse a Servidor
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

