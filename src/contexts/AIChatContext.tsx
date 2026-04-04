import React, { createContext, useContext, useState, useRef } from "react";
import { useStreamingChat } from "@/hooks/useStreamingChat";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatContextProps {
  messages: DisplayMessage[];
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentSessionRef: React.MutableRefObject<string | null>;
  isStreaming: boolean;
  streamMessage: ReturnType<typeof useStreamingChat>["streamMessage"];
}

const AIChatContext = createContext<AIChatContextProps | undefined>(undefined);

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  // useStreamingChat will safely exist at the provider level
  const { isStreaming, streamMessage } = useStreamingChat();

  return (
    <AIChatContext.Provider value={{
      messages,
      setMessages,
      inputValue,
      setInputValue,
      currentSessionId,
      setCurrentSessionId,
      currentSessionRef,
      isStreaming,
      streamMessage
    }}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChat() {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
}
