import React, { useEffect, useRef, useState } from "react";
import { runInMermaidQueue, sanitizeMermaidCode } from "@/components/notion/extensions/CodeBlockExtension";
import { Copy, Check, Eye, Code2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface MermaidRendererProps {
  code: string;
  title?: string;
}

let mermaidInstance: any = null;
let mermaidInitialized = false;

async function getMermaidInstance() {
  if (!mermaidInstance) {
    const m = await import("mermaid");
    mermaidInstance = m.default;
  }
  if (!mermaidInitialized) {
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      suppressErrorRendering: true,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: 13,
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 20,
        nodeSpacing: 45,
        rankSpacing: 45,
      },
      themeVariables: {
        darkMode: true,
        background: "transparent",
        mainBkg: "#27272a",
        nodeBorder: "#FFE600",
        textColor: "#ffffff",
        lineColor: "#00E5FF",
        edgeLabelBackground: "#18181b",
        primaryColor: "#27272a",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#FFE600",
        secondaryColor: "#18181b",
        tertiaryColor: "#121214",
        nodeTextColor: "#ffffff",
        clusterBkg: "#1f1f23",
        clusterBorder: "#3f3f46",
        titleColor: "#ffffff",
      },
    });
    mermaidInitialized = true;
  }
  return mermaidInstance;
}

/**
 * Convierte un esquema de mindmap con problemas de sintaxis a un flowchart TD
 * impecable para garantizar que SIEMPRE se renderice de forma visual y elegante.
 */
function convertMindmapToFlowchart(mindmapCode: string): string {
  const lines = mindmapCode.split("\n");
  const result: string[] = ["flowchart TD"];
  const stack: { level: number; id: string }[] = [];
  let idCounter = 1;

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith("mindmap")) continue;

    // Medir nivel de indentación
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    let label = rawLine.trim();

    // Limpiar caracteres de nodo (como root(("Texto")) o id["Texto"])
    const shapeMatch = label.match(
      /^([A-Za-z0-9_-]+)?\s*[\(\[\{]{1,2}["']?(.*?)["']?[\)\]\}]{1,2}$/
    );
    if (shapeMatch && shapeMatch[2]) {
      label = shapeMatch[2].trim();
    }

    const currentId = `node_${idCounter++}`;
    const cleanLabel = label.replace(/["\(\)\[\]\{\}]/g, "'").trim();

    // Buscar padre según nivel de sangría
    while (stack.length > 0 && stack[stack.length - 1].level >= indent) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parent = stack[stack.length - 1];
      result.push(`  ${parent.id} --> ${currentId}["${cleanLabel}"]`);
    } else {
      result.push(`  ${currentId}["${cleanLabel}"]`);
    }

    stack.push({ level: indent, id: currentId });
  }

  return result.length > 1 ? result.join("\n") : "flowchart TD\n  A[Diagrama Conceptual]";
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, title }) => {
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRawCode, setShowRawCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  const cleanCode = sanitizeMermaidCode(code);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const render = async () => {
      try {
        const mermaid = await getMermaidInstance();
        // ID seguro para selectores D3 y CSS
        const id = `mmd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

        const renderedSvg = await runInMermaidQueue(async () => {
          // El contenedor TEMPORAL DEBE estar insertado en document.body para que getBBox() funcione en SVG
          const tempContainer = document.createElement("div");
          tempContainer.id = "c_" + id;
          tempContainer.style.position = "absolute";
          tempContainer.style.top = "-9999px";
          tempContainer.style.left = "-9999px";
          tempContainer.style.visibility = "hidden";
          tempContainer.style.fontFamily =
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          tempContainer.style.fontSize = "13px";
          tempContainer.style.lineHeight = "1.35";
          document.body.appendChild(tempContainer);

          try {
            let result;
            try {
              result = await mermaid.render(id, cleanCode, tempContainer);
            } catch (firstErr) {
              // Si falla por sintaxis de mindmap o comillas, intentar con fallback inteligente a flowchart
              if (cleanCode.toLowerCase().includes("mindmap")) {
                const fallbackCode = convertMindmapToFlowchart(cleanCode);
                const fallbackId = `fb_${id}`;
                result = await mermaid.render(fallbackId, fallbackCode, tempContainer);
              } else {
                throw firstErr;
              }
            }
            return result.svg;
          } finally {
            tempContainer.remove();
          }
        });

        if (!isCancelled) {
          setSvgHtml(renderedSvg);
          setLoading(false);
          setError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("[MermaidRenderer] Error renderizando diagrama:", err);
          setError(err?.message || "No se pudo graficar el diagrama");
          setLoading(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [cleanCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border-3 border-foreground bg-card overflow-hidden shadow-[6px_6px_0_0_#000] my-4">
      {/* Header del bloque de diagrama */}
      <div className="px-4 py-3 bg-muted/80 border-b-2 border-foreground flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] shrink-0" />
          <span className="text-xs font-black uppercase truncate text-foreground tracking-wide">
            {title || "Diagrama Conceptual de Examen (Mermaid)"}
          </span>
        </div>

        {/* Acciones del visor */}
        <div className="flex items-center gap-1.5 shrink-0">
          {svgHtml && !showRawCode && (
            <div className="flex items-center gap-1 bg-background/60 border border-foreground/30 rounded-lg p-0.5 mr-1">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(0.7, s - 0.15))}
                className="p-1 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Alejar"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1 text-muted-foreground">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(1.6, s + 0.15))}
                className="p-1 rounded hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Acercar"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowRawCode(!showRawCode)}
            className="px-2.5 py-1 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition-all shadow-[1.5px_1.5px_0_0_#000]"
          >
            {showRawCode ? <Eye className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
            <span>{showRawCode ? "Ver Diagrama" : "Ver Código"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-[10px] font-black uppercase cursor-pointer transition-all shadow-[1.5px_1.5px_0_0_#000]"
            title="Copiar código Mermaid"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#BFFF00]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Canvas del Diagrama */}
      <div className="p-4 sm:p-6 bg-card/60 backdrop-blur-sm overflow-x-auto min-h-[140px] flex items-center justify-center">
        {showRawCode ? (
          <pre className="w-full p-4 rounded-2xl bg-muted/70 border-2 border-foreground text-xs font-mono text-foreground whitespace-pre overflow-x-auto shadow-[2px_2px_0_0_#000]">
            {cleanCode}
          </pre>
        ) : loading ? (
          <div className="py-10 text-center space-y-2">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#00E5FF]" />
            <span className="text-xs font-black uppercase text-muted-foreground block">
              Graficando diagrama interactivo...
            </span>
          </div>
        ) : error && !svgHtml ? (
          <div className="w-full space-y-2 text-left">
            <div className="text-xs font-black uppercase text-amber-500">
              ⚠️ Visualización esquemática (código del diagrama):
            </div>
            <pre className="p-4 rounded-2xl bg-muted/60 border-2 border-foreground/40 text-xs font-mono text-foreground whitespace-pre overflow-x-auto">
              {cleanCode}
            </pre>
          </div>
        ) : (
          <div
            className="mermaid-rendered w-full flex justify-center items-center transition-transform duration-200 py-2 [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto [&_svg]:drop-shadow-md"
            style={{ transform: `scale(${zoomScale})`, transformOrigin: "center top" }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}
      </div>
    </div>
  );
};
