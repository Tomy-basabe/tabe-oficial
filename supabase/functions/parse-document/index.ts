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
    // DEBUG: log auth header presence
    console.log("Auth Header present:", !!authHeader, "Header start:", authHeader?.substring(0, 10));

    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Invalid token: User verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Authorized User:", userId);

    const { fileUrl, storagePath, fileName, fileType } = (await req.json()) as ParseDocumentRequest;

    if (!fileName || typeof fileName !== 'string') {
      return new Response(
        JSON.stringify({ error: "fileName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fileName.length > 255) {
      return new Response(
        JSON.stringify({ error: "fileName too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let fileBuffer: ArrayBuffer;

    if (storagePath) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      // Validate storagePath belongs to user
      if (!storagePath.startsWith(`${userId}/`)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this file" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({ error: "Invalid file URL - must be from storage" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
      }
      fileBuffer = await fileResponse.arrayBuffer();
    } else {
      return new Response(
        JSON.stringify({ error: "Either fileUrl or storagePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fileBuffer.byteLength > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 20MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
          // Detect headings (lines ending with no period, shorter than 80 chars)
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

    // For PDF/DOCX: use Gemini API via Google AI
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    // Build base64 content
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
    // Bloques del documento
  ]
}

Tipos de bloques permitidos:
- {"type": "heading", "attrs": {"level": 1|2|3}, "content": [{"type": "text", "text": "..."}]}
- {"type": "paragraph", "content": [{"type": "text", "text": "..."}]}
- {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [...]}]}]}
- {"type": "orderedList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [...]}]}]}
- {"type": "blockquote", "content": [{"type": "paragraph", "content": [...]}]}
- {"type": "codeBlock", "attrs": {"language": "..."}, "content": [{"type": "text", "text": "..."}]}
- {"type": "horizontalRule"}

Para texto con formato dentro de content:
- Negrita: {"type": "text", "marks": [{"type": "bold"}], "text": "..."}
- Cursiva: {"type": "text", "marks": [{"type": "italic"}], "text": "..."}
- Subrayado: {"type": "text", "marks": [{"type": "underline"}], "text": "..."}

Extrae todo el contenido del documento manteniendo la estructura original (títulos, párrafos, listas, etc).
Responde SOLO con el JSON, sin explicaciones ni markdown.`;

    let aiResponseData: any;

    if (geminiApiKey) {
      // Use Google Gemini API directly
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
        const errorText = await geminiResponse.text();
        console.error("Gemini API Error:", errorText);
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      aiResponseData = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      // Fallback: try LOVABLE_API_KEY
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) {
        throw new Error("No AI API key configured (need GEMINI_API_KEY or LOVABLE_API_KEY)");
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-preview-02-05",
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
        const errorText = await aiResponse.text();
        console.error("Lovable AI API Error:", errorText);
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      aiResponseData = aiData.choices?.[0]?.message?.content || "";
    }

    // Parse the JSON from the response
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
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: fileName.replace(/\.[^.]+$/, "") }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: typeof aiResponseData === 'string' ? aiResponseData : "No se pudo parsear el documento" }],
          },
        ],
      };
    }

    if (!tiptapContent.type || tiptapContent.type !== "doc") {
      tiptapContent = { type: "doc", content: [tiptapContent] };
    }
    if (!Array.isArray(tiptapContent.content)) {
      tiptapContent.content = [{ type: "paragraph", content: [{ type: "text", text: "Documento vacío" }] }];
    }

    return new Response(
      JSON.stringify({ success: true, content: tiptapContent, fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error parsing document:", error);
    const errorMessage = error instanceof Error ? error.message : "Error parsing document";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});