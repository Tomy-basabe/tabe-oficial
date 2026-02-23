import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AIPersona {
    id: string;
    user_id: string;
    name: string;
    avatar_emoji: string;
    description: string;
    personality_prompt: string;
    is_default: boolean;
    created_at: string;
}

export interface AIChatSession {
    id: string;
    persona_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface AIChatMessage {
    id: string;
    session_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

const DEFAULT_PERSONA: Omit<AIPersona, "id" | "user_id" | "created_at"> = {
    name: "T.A.B.E. IA",
    avatar_emoji: "🤖",
    description: "Tu asistente académico inteligente",
    personality_prompt:
        "Sos un asistente académico motivador, amigable y cercano. Usás lenguaje informal argentino. Celebrás los logros del estudiante y lo alentás cuando tiene dificultades. Sos empático pero también honesto.",
    is_default: true,
};

export function useAIPersonas() {
    const { user, isGuest, loading: authLoading } = useAuth();
    const [personas, setPersonas] = useState<AIPersona[]>([]);
    const [activePersona, setActivePersona] = useState<AIPersona | null>(null);
    const [sessions, setSessions] = useState<AIChatSession[]>([]);
    const [loading, setLoading] = useState(true);

    // Load personas
    const loadPersonas = useCallback(async () => {
        if (authLoading) return; // Wait for auth to finish

        const localFallback: AIPersona = {
            id: "local-default",
            user_id: user?.id || "anonymous",
            ...DEFAULT_PERSONA,
            created_at: new Date().toISOString(),
        };

        if (!user) {
            // Not logged in — use local fallback
            setPersonas([localFallback]);
            setActivePersona(localFallback);
            setLoading(false);
            return;
        }

        const { data, error } = await (supabase as any)
            .from("ai_personas")
            .select("*")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: true });

        if (error) {
            console.warn("ai_personas table not available, using local fallback:", error.message);
            setPersonas([localFallback]);
            setActivePersona(localFallback);
            setLoading(false);
            return;
        }

        let personaList = (data || []) as unknown as AIPersona[];

        // Auto-create default persona if none exist
        if (personaList.length === 0) {
            const { data: newPersona, error: createError } = await (supabase as any)
                .from("ai_personas")
                .insert({
                    user_id: user.id,
                    ...DEFAULT_PERSONA,
                })
                .select()
                .single();

            if (createError) {
                console.warn("Could not create default persona, using local fallback");
                personaList = [localFallback];
            } else if (newPersona) {
                personaList = [newPersona as unknown as AIPersona];
            }
        }

        setPersonas(personaList);

        // Set active persona to the stored one or default
        const storedId = localStorage.getItem("tabe-active-persona");
        const found = personaList.find((p) => p.id === storedId);
        setActivePersona(found || personaList[0] || null);
        setLoading(false);
    }, [user, authLoading]);

    useEffect(() => {
        loadPersonas();
    }, [loadPersonas]);

    // Switch active persona
    const switchPersona = useCallback(
        (persona: AIPersona) => {
            setActivePersona(persona);
            localStorage.setItem("tabe-active-persona", persona.id);
        },
        []
    );

    // Create persona
    const createPersona = useCallback(
        async (data: {
            name: string;
            avatar_emoji: string;
            description: string;
            personality_prompt: string;
        }) => {
            if (!user) return null;
            const { data: newPersona, error } = await (supabase as any)
                .from("ai_personas")
                .insert({
                    user_id: user.id,
                    name: data.name,
                    avatar_emoji: data.avatar_emoji,
                    description: data.description,
                    personality_prompt: data.personality_prompt,
                    is_default: false,
                } as any)
                .select()
                .single();

            if (error) {
                console.error("Error creating persona:", error);
                return null;
            }

            const persona = newPersona as unknown as AIPersona;
            setPersonas((prev) => [...prev, persona]);
            switchPersona(persona);
            return persona;
        },
        [user, switchPersona]
    );

    // Delete persona
    const deletePersona = useCallback(
        async (personaId: string) => {
            const { error } = await (supabase as any)
                .from("ai_personas")
                .delete()
                .eq("id", personaId);

            if (error) {
                console.error("Error deleting persona:", error);
                return false;
            }

            setPersonas((prev) => {
                const remaining = prev.filter((p) => p.id !== personaId);
                if (activePersona?.id === personaId) {
                    const def = remaining.find((p) => p.is_default) || remaining[0];
                    if (def) switchPersona(def);
                }
                return remaining;
            });
            return true;
        },
        [activePersona, switchPersona]
    );

    // Update persona (name, emoji, prompt, etc)
    const updatePersona = useCallback(
        async (personaId: string, updates: Partial<AIPersona>) => {
            const { error } = await (supabase as any)
                .from("ai_personas")
                .update({ ...updates, updated_at: new Date().toISOString() } as any)
                .eq("id", personaId);

            if (!error) {
                setPersonas((prev) =>
                    prev.map((p) => (p.id === personaId ? { ...p, ...updates } : p))
                );
                // Si estamos editando el activo, actualizarlo en local
                if (activePersona?.id === personaId) {
                    setActivePersona((prev) => prev ? { ...prev, ...updates } : prev);
                }
            }
            return !error;
        },
        [activePersona]
    );

    // Update persona personality (for learning/evolution)
    const updatePersonaPrompt = useCallback(
        async (personaId: string, personality_prompt: string) => {
            const { error } = await (supabase as any)
                .from("ai_personas")
                .update({ personality_prompt, updated_at: new Date().toISOString() } as any)
                .eq("id", personaId);

            if (!error) {
                setPersonas((prev) =>
                    prev.map((p) =>
                        p.id === personaId ? { ...p, personality_prompt } : p
                    )
                );
            }
        },
        []
    );

    // ---- CHAT SESSIONS ----

    const loadSessions = useCallback(
        async (personaId: string) => {
            if (!user) return;
            const { data, error } = await (supabase as any)
                .from("ai_chat_sessions")
                .select("*")
                .eq("user_id", user.id)
                .eq("persona_id", personaId)
                .order("updated_at", { ascending: false })
                .limit(30);

            if (error) {
                console.error("Error loading sessions:", error);
                return;
            }
            setSessions((data || []) as unknown as AIChatSession[]);
        },
        [user]
    );

    const createSession = useCallback(
        async (personaId: string, title: string) => {
            if (!user && !isGuest) return null;

            if (isGuest) {
                const localSession: AIChatSession = {
                    id: `local-${Date.now()}`,
                    persona_id: personaId,
                    title,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setSessions((prev) => [localSession, ...prev]);
                return localSession;
            }

            const { data, error } = await (supabase as any)
                .from("ai_chat_sessions")
                .insert({
                    user_id: user.id,
                    persona_id: personaId,
                    title,
                } as any)
                .select()
                .single();

            if (error) {
                console.warn("Could not create session in DB, using local session");
                const localSession: AIChatSession = {
                    id: `local-${Date.now()}`,
                    persona_id: personaId,
                    title,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setSessions((prev) => [localSession, ...prev]);
                return localSession;
            }
            const session = data as unknown as AIChatSession;
            setSessions((prev) => [session, ...prev]);
            return session;
        },
        [user]
    );

    const deleteSession = useCallback(async (sessionId: string) => {
        const { error } = await (supabase as any)
            .from("ai_chat_sessions")
            .delete()
            .eq("id", sessionId);

        if (!error) {
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        }
        return !error;
    }, []);

    // ---- CHAT MESSAGES ----

    const loadMessages = useCallback(async (sessionId: string) => {
        const { data, error } = await (supabase as any)
            .from("ai_chat_messages")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error loading messages:", error);
            return [];
        }
        return (data || []) as unknown as AIChatMessage[];
    }, []);

    const saveMessage = useCallback(
        async (sessionId: string, role: "user" | "assistant", content: string) => {
            // Skip DB save for local sessions
            if (sessionId.startsWith("local-")) return null;

            const { data, error } = await (supabase as any)
                .from("ai_chat_messages")
                .insert({ session_id: sessionId, role, content } as any)
                .select()
                .single();

            if (error) {
                console.warn("Could not save message to DB:", error.message);
                return null;
            }

            // Update session timestamp
            await (supabase as any)
                .from("ai_chat_sessions")
                .update({ updated_at: new Date().toISOString() } as any)
                .eq("id", sessionId);

            return data as unknown as AIChatMessage;
        },
        []
    );

    return {
        personas,
        activePersona,
        sessions,
        loading,
        switchPersona,
        createPersona,
        updatePersona,
        deletePersona,
        updatePersonaPrompt,
        loadSessions,
        createSession,
        deleteSession,
        loadMessages,
        saveMessage,
        loadPersonas,
    };
}
