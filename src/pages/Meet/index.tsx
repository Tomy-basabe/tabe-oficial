import React from 'react';
import { useParams } from 'react-router-dom';
import { MeetLobby } from './MeetLobby';
import { MeetRoom } from './MeetRoom';

export const MeetPage: React.FC = () => {
  const { roomId } = useParams<{ roomId?: string }>();

  // Si hay roomId en la URL, entramos directamente a la sala MeetRoom (la cual arranca en su lobby de preparación)
  if (roomId) {
    return <MeetRoom />;
  }

  // Si no hay roomId, mostramos el portal de inicio para crear o unirse por código
  return <MeetLobby />;
};

export default MeetPage;
