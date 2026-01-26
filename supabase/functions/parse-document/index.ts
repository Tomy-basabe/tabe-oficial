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
    // SECURITY: Verify authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Verify user authentication
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const { fileUrl, storagePath, fileName, fileType } = (await req.json()) as ParseDocumentRequest;

    // Validate required fields
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

    // SECURITY: Only allow fetching from Supabase storage or use storagePath
    if (storagePath) {
      // Use service role to download from private storage
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      
      // Validate storagePath belongs to user (should start with userId/)
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
      // SECURITY: Only allow Supabase storage URLs
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

    // Validate file size (max 20MB)
    if (fileBuffer.byteLength > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 20MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base64Content = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Determine MIME type
    let mimeType = "application/octet-stream";
    const ext = fileName.toLowerCase().split(".").pop();
    switch (ext) {
      case "pdf":
        mimeType = "application/pdf";
        break;
      case "docx":
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "doc":
        mimeType = "application/msword";
        break;
      case "pptx":
        mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        break;
      case "xlsx":
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "txt":
        mimeType = "text/plain";
        break;
    }

    // Use Lovable AI to extract and structure the content
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "file",
                file: {
                  filename: fileName,
                  file_data: `data:${mimeType};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API Error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    let tiptapContent;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      tiptapContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", rawContent);
      // Fallback: create simple document with the raw text
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
            content: [{ type: "text", text: rawContent }],
          },
        ],
      };
    }

    // Validate and fix the content structure
    if (!tiptapContent.type || tiptapContent.type !== "doc") {
      tiptapContent = { type: "doc", content: [tiptapContent] };
    }
    if (!Array.isArray(tiptapContent.content)) {
      tiptapContent.content = [{ type: "paragraph", content: [{ type: "text", text: "Documento vacío" }] }];
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: tiptapContent,
        fileName: fileName,
      }),
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