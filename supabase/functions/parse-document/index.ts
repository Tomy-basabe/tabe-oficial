import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseDocumentRequest {
  fileUrl?: string;
  storagePath?: string;
  fileName: string;
  fileType: string;
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

    // Verify user authentication via getUser
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth Error:", userError);
      throw new Error("Invalid token: User verification failed");
    }

    const userId = user.id;

    const requestBody = await req.json();
    console.log("Request Payload:", JSON.stringify(requestBody)); // DEBUG LOG

    let { fileUrl, storagePath, fileName, fileType } = requestBody as ParseDocumentRequest;

    if (!fileName) throw new Error("fileName is required");
    if (fileName.length > 255) throw new Error("fileName too long");

    // DATA NORMALIZATION:
    // If we have a fileUrl that points to our own storage, converting it to a storagePath is safer/better
    // because it uses the Service Role key for internal access (bypassing public auth issues).
    if (fileUrl && fileUrl.includes('/storage/v1/object/')) {
      try {
        const urlObj = new URL(fileUrl);
        // Pattern: /storage/v1/object/public/BUCKET/PATH... or /sign/BUCKET/PATH...
        const pathParts = urlObj.pathname.split('/storage/v1/object/')[1].split('/');
        // pathParts[0] is 'public' or 'sign'
        // pathParts[1] is bucket (e.g. 'library-files')
        // pathParts.slice(2) is the path
        if (pathParts.length >= 3 && pathParts[1] === 'library-files') {
          const extractedPath = pathParts.slice(2).join('/');
          console.log(`Converted URL to storagePath: ${extractedPath}`);
          storagePath = extractedPath;
          fileUrl = undefined; // Clear fileUrl so we use the download logic
        }
      } catch (e) {
        console.warn("Failed to parse storage URL:", e);
      }
    }

    let fileBuffer: ArrayBuffer;

    if (storagePath) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      // Validate storagePath belongs to user (security check)
      // Allow if it starts with userId OR if it's in a public context we trust? 
      // Strict check: must start with userId.
      if (!storagePath.startsWith(`${userId}/`)) {
        console.warn(`Access check failed. User: ${userId}, Path: ${storagePath}`);
        // If converting from URL, maybe we should be more lenient? 
        // But for now, enforce ownership for security.
        throw new Error("Access denied to this file (path mismatch)");
      }

      const { data: fileData, error: downloadError } = await serviceClient.storage
        .from('library-files')
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
      }

      fileBuffer = await fileData.arrayBuffer();
    } else if (fileUrl) {
      if (!fileUrl.startsWith(`${supabaseUrl}/storage/`)) {
        throw new Error("Invalid file URL - must be from storage");
      }

      console.log(`Fetching from URL: ${fileUrl}`);
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.statusText} (${fileResponse.status})`);
      }
      fileBuffer = await fileResponse.arrayBuffer();
    } else {
      throw new Error("Either fileUrl or storagePath is required");
    }

    if (fileBuffer.byteLength > 20 * 1024 * 1024) {
      throw new Error("File too large (max 20MB)");
    }

    // For TXT files, process locally without AI
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "txt" || fileType === "text/plain") {
      const textContent = new TextDecoder().decode(new Uint8Array(fileBuffer));
      const paragraphs = textContent.split(/\n\n+/).filter(p => p.trim());

      const tiptapContent = {
        type: "doc",
        content: paragraphs.map(p => {
          const trimmed = p.trim();
          if (trimmed.length < 80 && !trimmed.endsWith('.') && !trimmed.includes('\n')) {
            return {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: trimmed }]
            };
          }
          return {
            type: "paragraph",
            content: [{ type: "text", text: trimmed }]
          };
        })
      };

      return new Response(
        JSON.stringify({ success: true, content: tiptapContent, fileName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For PDF/DOCX: AI Processing
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Convert buffer to base64
    const base64Content = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    let mimeType = "application/octet-stream";
    switch (ext) {
      case "pdf": mimeType = "application/pdf"; break;
      case "docx": mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
      case "doc": mimeType = "application/msword"; break;
      case "pptx": mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"; break;
      case "xlsx": mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; break;
    }

    const prompt = `Analiza el siguiente documento y extrae su contenido estructurado.
IMPORTANTE: Responde ÚNICAMENTE con un JSON válido sin markdown ni texto adicional.
El JSON debe tener esta estructura TipTap:
{
  "type": "doc",
  "content": [
    // Bloques del documento (headings, paragraphs, lists)
  ]
}
Extrae todo el contenido. Responde SOLO con el JSON.`;

    let aiResponseData: any;
    let usedModel = "";

    // ATTEMPT 1: Gemini Direct
    try {
      if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");
      console.log("Attempting Gemini Direct...");

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Content } }
            ]
          }],
          generationConfig: { maxOutputTokens: 16000 }
        }),
      });

      if (!geminiResponse.ok) {
        const err = await geminiResponse.text();
        // Forward 429 to trigger fallback
        if (geminiResponse.status === 429) {
          throw new Error(`Gemini 429 Rate Limit: ${err}`);
        }
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${err}`);
      }

      const geminiData = await geminiResponse.json();
      aiResponseData = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      usedModel = "gemini-direct-2.0";

    } catch (geminiError: any) {
      console.warn("Gemini Direct failed:", geminiError.message);

      // ATTEMPT 2: Lovable Gateway Fallback
      if (!lovableApiKey) {
        throw new Error(`Primary AI failed (${geminiError.message}) and LOVABLE_API_KEY missing.`);
      }

      console.log("Attempting Lovable Gateway fallback...");
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-1.5-flash-latest", // Use stable model for fallback
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "file", file: { filename: fileName, file_data: `data:${mimeType};base64,${base64Content}` } },
            ],
          }],
          max_tokens: 16000,
        }),
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.text();
        throw new Error(`All AI providers failed. Gemini: ${geminiError.message}. Lovable: ${aiResponse.status} - ${err}`);
      }

      const aiData = await aiResponse.json();
      aiResponseData = aiData.choices?.[0]?.message?.content || "";
      usedModel = "lovable-fallback";
    }

    // Parse JSON response
    let tiptapContent;
    try {
      let jsonStr = typeof aiResponseData === 'string' ? aiResponseData.trim() : JSON.stringify(aiResponseData);
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      tiptapContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponseData);
      tiptapContent = {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: fileName }] },
          { type: "paragraph", content: [{ type: "text", text: "Error parsing AI response. Raw text available if needed." }] },
        ],
      };
    }

    if (!tiptapContent.type) tiptapContent = { type: "doc", content: [tiptapContent] };

    return new Response(
      JSON.stringify({ success: true, content: tiptapContent, fileName, model: usedModel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Critical Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});