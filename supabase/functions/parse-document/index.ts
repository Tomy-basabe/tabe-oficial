import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getDocument } from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

// Needed for pdfjs-dist in non-browser env
// @ts-ignore
globalThis.window = globalThis;

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

// Helper to list available models dynamically
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.models) return [];

    // Prioritize models: Flash > Flash-Lite > Pro > Others
    // Support both generateContent (multimodal) and generateText (legacy) if needed?
    // For now we focused on generateContent models.
    const validModels = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", ""));

    // Custom sort order
    const priority = [
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-1.0-pro"
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

// Extract text from PDF buffer using pdfjs-dist
async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
    const pdf = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      text += pageText + "\n\n";
    }
    return text;
  } catch (e) {
    console.warn("PDF Text Extraction failed:", e);
    return "";
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
    console.log("Request Payload:", JSON.stringify(requestBody));

    let { fileUrl, storagePath, fileName, fileType } = requestBody as ParseDocumentRequest;

    if (!fileName) throw new Error("fileName is required");
    if (fileName.length > 255) throw new Error("fileName too long");

    // DATA NORMALIZATION
    if (fileUrl && fileUrl.includes('/storage/v1/object/')) {
      try {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/storage/v1/object/')[1].split('/');
        if (pathParts.length >= 3 && pathParts[1] === 'library-files') {
          const extractedPath = pathParts.slice(2).join('/');
          console.log(`Converted URL to storagePath: ${extractedPath}`);
          storagePath = extractedPath;
          fileUrl = undefined;
        }
      } catch (e) {
        console.warn("Failed to parse storage URL:", e);
      }
    }

    let fileBuffer: ArrayBuffer;

    if (storagePath) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      if (!storagePath.startsWith(`${userId}/`)) {
        console.warn(`Access check failed. User: ${userId}, Path: ${storagePath}`);
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

    // For TXT: process locally
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

    // AI Processing
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let mimeType = "application/octet-stream";
    switch (ext) {
      case "pdf": mimeType = "application/pdf"; break;
      case "docx": mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
      case "doc": mimeType = "application/msword"; break;
      case "pptx": mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"; break;
      case "xlsx": mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; break;
    }

    const base64Content = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Attempt to extract text for Fallback models (Gemini 1.0 Pro only accepts text)
    let extractedText = "";
    if (ext === "pdf") {
      console.log("Attempting PDF text extraction...");
      extractedText = await extractTextFromPdf(fileBuffer);
      if (extractedText) console.log("PDF Text extracted successfully (length: " + extractedText.length + ")");
    }

    const promptText = `Analiza el siguiente documento y extrae su contenido estructurado.
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
    let success = false;

    // ATTEMPT 1: Dynamic Gemini Discovery & Retry
    if (geminiApiKey) {
      console.log("Starting Dynamic Gemini Model Discovery...");

      let candidateModels = await getAvailableGeminiModels(geminiApiKey);
      if (candidateModels.length === 0) {
        console.warn("Could not list models. Using fallback list.");
        candidateModels = [
          "gemini-2.0-flash-lite",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-1.5-flash-8b",
          "gemini-1.5-pro",
          "gemini-1.0-pro" // Added explicit logic for this below
        ];
      }

      console.log(`Found candidate models: ${candidateModels.join(", ")}`);

      // Try up to 4 models
      for (const model of candidateModels.slice(0, 4)) {
        try {
          console.log(`Attempting Gemini Model: ${model}`);

          let body;
          // Strategy: if model is 1.0-pro (text only) OR we have extracted text and previous failed, use text
          const isTextOnlyModel = model.includes("1.0-pro");

          if (isTextOnlyModel) {
            if (!extractedText) {
              console.log("Skipping 1.0-pro because no text extracted.");
              continue;
            }
            // Text-only request
            body = {
              contents: [{ parts: [{ text: promptText + "\n\nDOCUMENT CONTENT:\n" + extractedText }] }],
              generationConfig: { maxOutputTokens: 16000 }
            };
          } else {
            // Multimodal request (default)
            body = {
              contents: [{
                parts: [
                  { text: promptText },
                  { inline_data: { mime_type: mimeType, data: base64Content } }
                ]
              }],
              generationConfig: { maxOutputTokens: 16000 }
            };
          }

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!geminiResponse.ok) {
            const err = await geminiResponse.text();
            throw new Error(`Status ${geminiResponse.status}: ${err}`);
          }

          const geminiData = await geminiResponse.json();
          aiResponseData = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          usedModel = `gemini-dynamic-${model}`;
          success = true;
          break; // Success!

        } catch (modelError: any) {
          console.warn(`Model ${model} failed: ${modelError.message}`);
          // If multimodal failed, and we have text, maybe try text-only on next loop?
        }
      }
    } else {
      console.warn("GEMINI_API_KEY missing.");
    }

    // ATTEMPT 2: Lovable Gateway Fallback
    if (!success) {
      if (!lovableApiKey) {
        throw new Error("All Gemini models failed (or key missing), and LOVABLE_API_KEY is missing.");
      }

      console.log("Attempting Lovable Gateway fallback...");
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-lite",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: promptText },
                { type: "file", file: { filename: fileName, file_data: `data:${mimeType};base64,${base64Content}` } },
              ],
            }],
            max_tokens: 16000,
          }),
        });

        if (!aiResponse.ok) {
          const err = await aiResponse.text();
          throw new Error(`Lovable Gateway failed: ${aiResponse.status} - ${err}`);
        }

        const aiData = await aiResponse.json();
        aiResponseData = aiData.choices?.[0]?.message?.content || "";
        usedModel = "lovable-fallback";
        success = true;

      } catch (lovableError: any) {
        throw new Error(`All strategies failed. Last error: ${lovableError.message}`);
      }
    }

    // Parse JSON
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