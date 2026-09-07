import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { AIModelOption, DEFAULT_AI_MODEL, AVAILABLE_AI_MODELS } from "@/config/aiModels";

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
  selectedModel: AIModelOption;
  setSelectedModel: (model: AIModelOption) => void;
  streamMessage: ReturnType<typeof useStreamingChat>["streamMessage"];
}

const AIChatContext = createContext<AIChatContextProps | undefined>(undefined);

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  const [selectedModel, setSelectedModelState] = useState<AIModelOption>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedId = localStorage.getItem("tabe_selected_ai_model");
        if (savedId) {
          const found = AVAILABLE_AI_MODELS.find((m) => m.id === savedId);
          if (found) return found;
        }
      } catch {}
    }
    return DEFAULT_AI_MODEL;
  });

  const setSelectedModel = (model: AIModelOption) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem("tabe_selected_ai_model", model.id);
    } catch {}
  };

  const { isStreaming, streamMessage } = useStreamingChat(selectedModel);

  return (
    <AIChatContext.Provider
      value={{
        messages,
        setMessages,
        inputValue,
        setInputValue,
        currentSessionId,
        setCurrentSessionId,
        currentSessionRef,
        isStreaming,
        selectedModel,
        setSelectedModel,
        streamMessage,
      }}
    >
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
