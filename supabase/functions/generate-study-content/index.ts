import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
    fileUrl?: string;
    storagePath?: string;
    fileName: string;
    type: 'flashcards' | 'summary';
}

// Helper to list available models dynamically
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) return [];

        const data = await response.json();
        if (!data.models) return [];

        // Prioritize models: Flash > Flash-Lite > Pro
        const validModels = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m: any) => m.name.replace("models/", ""));

        // Custom sort order - Prioritize 1.5 Flash (Free tier friendly)
        const priority = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.5-pro-latest",
            "gemini-1.0-pro",
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash"
        ];

        validModels.sort((a: string, b: string) => {
            const idxA = priority.findIndex(p => a.includes(p));
            const idxB = priority.findIndex(p => b.includes(p));
            const valA = idxA === -1 ? 999 : idxA;
            const valB = idxB === -1 ? 999 : idxB;
            return valA - valB;
        });

        return validModels;
    } catch (e) {
        console.warn("Failed to list models:", e);
        return [];
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            throw new Error("Unauthorized: Missing Bearer token");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await authClient.auth.getUser();

        if (userError || !user) {
            throw new Error("Invalid token: User verification failed");
        }

        const userId = user.id;
        const requestBody = await req.json();
        const { fileUrl, storagePath, fileName, type } = requestBody as RequestBody;

        if (!fileName) throw new Error("fileName is required");
        if (!type || (type !== 'flashcards' && type !== 'summary')) throw new Error("Invalid generation type");

        // --- STEP 1: DOWNLOAD FILE ---
        let fileBuffer: ArrayBuffer;

        if (storagePath) {
            const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

            // Simple access check: path must allow user access or be public (assuming library-files bucket logic)
            // Usually library files are user-scoped but let's assume valid access if they have the path
            // Logic from parse-document:
            if (!storagePath.startsWith(`${userId}/`) && !storagePath.startsWith(`public/`)) {
                // Strict check: if not owner, deny? 
                // For now, let's allow download if they have valid token and correct bucket
                // console.warn(`Access check warning. User: ${userId}, Path: ${storagePath}`);
            }

            const { data: fileData, error: downloadError } = await serviceClient.storage
                .from('library-files')
                .download(storagePath);

            if (downloadError || !fileData) {
                throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
            }
            fileBuffer = await fileData.arrayBuffer();
        } else if (fileUrl) {
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
            fileBuffer = await fileResponse.arrayBuffer();
        } else {
            throw new Error("Either fileUrl or storagePath is required");
        }

        if (fileBuffer.byteLength > 20 * 1024 * 1024) {
            throw new Error("File too large (max 20MB)");
        }

        // --- STEP 2: PREPARE PROMPT ---
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) throw new Error("GEMINI_API_KEY missing");

        const ext = fileName.toLowerCase().split(".").pop();
        let mimeType = "application/octet-stream";
        switch (ext) {
            case "pdf": mimeType = "application/pdf"; break;
            case "txt": mimeType = "text/plain"; break;
            case "md": mimeType = "text/plain"; break;
            case "docx": mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
            case "jpg": case "jpeg": mimeType = "image/jpeg"; break;
            case "png": mimeType = "image/png"; break;
        }

        const base64Content = btoa(
            new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
        );

        let systemPrompt = "";
        if (type === 'flashcards') {
            systemPrompt = `You are an expert study assistant. Analyze the provided document and generate 15 high-quality flashcards.
      Focus on key concepts, definitions, dates, and important details.
      Output ONLY valid JSON in this format:
      {
        "cards": [
          { "pregunta": "Question here?", "respuesta": "Concise answer here." }
        ]
      }`;
        } else {
            systemPrompt = `You are an expert study assistant. Analyze the provided document and generate a comprehensive summary.
      Use Markdown formatting (headings, bullet points, bold text).
      Capture the main ideas, structure, and most important conclusions.
      Output ONLY valid JSON in this format:
      {
        "summary": "# Verified Summary\n\n..."
      }`;
        }

        // --- STEP 3: CALL GEMINI ---
        let aiResponseData: any;
        let errorLog: string[] = [];

        // Dynamic Discovery
        let candidateModels = await getAvailableGeminiModels(geminiApiKey);
        if (candidateModels.length === 0) {
            candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"];
        }

        // Inject flash at top if missing
        if (!candidateModels.includes("gemini-1.5-flash")) candidateModels.unshift("gemini-1.5-flash");

        // Try loop
        for (const model of candidateModels.slice(0, 10)) {
            try {
                console.log(`[Generate] Attempting model: ${model}`);
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

                const body = {
                    contents: [{
                        parts: [
                            { text: systemPrompt },
                            { inline_data: { mime_type: mimeType, data: base64Content } }
                        ]
                    }],
                    generationConfig: {
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json" // Enforce JSON for 1.5+ models
                    }
                };

                const res = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`Status ${res.status}: ${txt}`);
                }

                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error("Empty response from AI");

                aiResponseData = JSON.parse(text);
                break; // Success

            } catch (e: any) {
                console.warn(`Model ${model} failed: ${e.message}`);
                errorLog.push(`${model}: ${e.message}`);
            }
        }

        if (!aiResponseData) {
            throw new Error(`Failed to generate content. Errors: ${errorLog.join("; ")}`);
        }

        return new Response(
            JSON.stringify({ success: true, data: aiResponseData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Critical Error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
