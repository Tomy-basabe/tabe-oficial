import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseDocumentRequest {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, fileType } = (await req.json()) as ParseDocumentRequest;

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "fileUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the file content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
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

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
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