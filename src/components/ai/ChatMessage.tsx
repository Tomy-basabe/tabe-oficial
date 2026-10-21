import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Normaliza y preprocesa fórmulas LaTeX, tablas y listas de Markdown generadas por la IA
 * (incluyendo el clúster de NVIDIA NIM, Edge Functions y fallbacks analíticos)
 * para que remark-math, remark-gfm y rehype-katex las reconozcan y rendericen limpiamente.
 */
export function preprocessMarkdownAndLaTeX(content: string): string {
  if (!content) return "";

  // Separar por bloques de código (```) para no alterar código de programación
  const parts = content.split(/(```[\s\S]*?```)/g);

  const processedParts = parts.map((part) => {
    if (part.startsWith("```")) {
      return part;
    }

    let text = part;

    // 1. Limpieza de duplicación de dos puntos en etiquetas académicas (ej: "actual: (materias...):")
    text = text.replace(/Promedio general actual:\s*\(materias aprobadas\):\s*/gi, "Promedio general actual (materias aprobadas): ");

    // 2. Normalizar viñetas unicode pegadas en medio de una misma línea de texto
    // Ej: "... = 147.00) • Progreso de carrera: 19/37 ... • Materias aprobadas ..."
    // Convierte cada viñeta en medio de texto en un salto doble con lista Markdown válida
    text = text.replace(/([^\n])\s*[•▪▫◦✦]\s+/g, "$1\n\n- ");

    // 3. Viñetas unicode al inicio de línea -> convertir a lista estándar Markdown "- "
    text = text.replace(/^[•▪▫◦✦]\s+/gm, "- ");

    // 4. Asegurar salto de línea doble antes de listas que siguen a un párrafo o encabezado
    // En CommonMark / Markdown estándar, si no hay \n\n antes de un ítem de lista ("- "),
    // el parser lo fusiona con el párrafo anterior en una sola línea continua.
    text = text.replace(/([^\n])\n(- |\* |\d+\. )/g, "$1\n\n$2");

    // 5. Encabezados o etiquetas con dos puntos seguidos de una lista (ej: "Tu situación académica actual:\n- ...")
    text = text.replace(/([^\n]:)\n\n?(- |\* |\d+\. )/g, "$1\n\n$2");

    // 6. Detectar listas densas de materias separadas por comas en una sola línea
    // Ej: "Materias aprobadas con nota: Análisis Matemático I (1° año): 8.00, Álgebra y Geometría Analítica (1° año): 7.00, ..."
    // Las transforma automáticamente en una lista vertical limpia con sub-viñetas indentadas y notas resaltadas.
    text = text.replace(
      /((?:- \*\*Materias aprobadas(?: con nota)?:\*\*|- Materias aprobadas(?: con nota)?:|\*\*Materias aprobadas(?: con nota)?:\*\*|Materias aprobadas(?: con nota)?:)\s*)([^\n]+)/gi,
      (_match, header, listStr) => {
        if (listStr.includes(":") && listStr.includes(",")) {
          const items = listStr
            .split(/,\s*(?=[A-ZÁÉÍÓÚÑa-záéíóúñ\d\s\-/+]+(?:\([^)]+\))?:\s*\d)/)
            .map((item: string) => item.trim())
            .filter(Boolean);

          if (items.length > 1) {
            const cleanHeader = header.trim();
            const formattedHeader = cleanHeader.startsWith("- ") ? cleanHeader : `- ${cleanHeader}`;
            const formattedItems = items
              .map((it: string) => {
                const highlighted = it.replace(/:\s*(\d+(?:[.,]\d+)?)/, ": **$1**");
                return `  - ${highlighted}`;
              })
              .join("\n");
            return `${formattedHeader}\n${formattedItems}`;
          }
        }
        return `${header}${listStr}`;
      }
    );

    // 7. Si después de un bloque de viñetas viene un texto de cierre sin salto de línea doble, separarlo
    text = text.replace(/(\n {2,}- [^\n]+)\n([A-ZÁÉÍÓÚÑ¡¿][^\n]+)/g, "$1\n\n$2");

    // 8. Asegurar salto de línea antes de tablas Markdown (| Col | Col |) para que remark-gfm las detecte
    text = text.replace(/([^\n])\n(\|.*?\|)\n/g, "$1\n\n$2\n");

    // 9. Convertir bloques matemáticos LaTeX \[ ... \] a $$ ... $$
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
      return `\n$$\n${math.trim()}\n$$\n`;
    });

    // 10. Convertir fórmulas en línea \( ... \) a $ ... $
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
      return `$${math.trim()}$`;
    });

    // 11. Envolver entornos comunes de LaTeX (\begin{aligned}...\end{aligned}, matrices, casos) en $$ si no lo están
    const environments = [
      "aligned",
      "align\\*?",
      "matrix",
      "pmatrix",
      "bmatrix",
      "vmatrix",
      "cases",
      "equation\\*?",
      "gather\\*?",
      "split"
    ];

    for (const env of environments) {
      const regex = new RegExp(`(?<!\\$)(?:\\\\begin\\{${env}\\}[\\s\\S]*?\\\\end\\{${env}\\})(?!\\$)`, "g");
      text = text.replace(regex, (match) => {
        return `\n$$\n${match.trim()}\n$$\n`;
      });
    }

    return text;
  });

  return processedParts.join("");
}

interface ChatMessageContentProps {
  content: string;
  className?: string;
}

/**
 * Componente de renderizado de contenido enriquecido para mensajes del Chat IA.
 * Soporta Markdown completo (GFM), tablas con scroll responsivo y LaTeX (KaTeX) inline y en bloque.
 */
export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({ content, className }) => {
  const processedContent = useMemo(() => preprocessMarkdownAndLaTeX(content), [content]);

  return (
    <div
      className={cn(
        "prose prose-sm md:prose-base dark:prose-invert max-w-none break-words text-foreground font-normal leading-relaxed",
        "prose-p:leading-relaxed prose-p:my-2",
        "prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-3 prose-pre:rounded-xl",
        "prose-math:text-base prose-math:font-medium",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Renderizado enriquecido y responsive de tablas GFM
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-xl border-2 border-foreground/70 dark:border-foreground/30 shadow-[2px_2px_0_0_hsl(var(--foreground))] bg-card">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted font-bold text-foreground border-b-2 border-foreground/50">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 border-r last:border-r-0 border-border font-black uppercase text-[11px] tracking-wider text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 border-t border-r last:border-r-0 border-border/60 text-foreground/90 font-medium">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/40 transition-colors odd:bg-background even:bg-muted/15">
              {children}
            </tr>
          ),
          // Código inline y bloques
          code: ({ className, children, ...props }: any) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[0.88em] font-semibold text-primary border border-border"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Listas con espaciado limpio y soporte para anidamiento jerárquico
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2.5 space-y-1.5 [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-[circle] [&_ul_ul]:list-[square]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2.5 space-y-1.5 [&_ol]:my-1.5 [&_ol]:pl-5">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed marker:text-primary">
              {children}
            </li>
          ),
          // Imágenes embebidas / generadas por la IA con NVIDIA Flux.1-dev
          img: ({ src, alt, ...props }: any) => {
            const cleanSrc = src || "";
            if (!cleanSrc) return null;

            return (
              <div className="my-3.5 max-w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md bg-zinc-950/5 group relative">
                <img
                  src={cleanSrc}
                  alt={alt || "Ilustración generada con NVIDIA Flux.1-dev"}
                  loading="lazy"
                  className="w-full max-h-[520px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                  {...props}
                />
                <div className="px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
                  <span className="truncate">{alt || "Generado con NVIDIA Flux.1-dev"}</span>
                  <a
                    href={cleanSrc}
                    download={`tabe-ai-nvidia-${Date.now()}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors underline font-mono text-[10px]"
                  >
                    Descargar / Abrir HD ↗
                  </a>
                </div>
              </div>
            );
          },
          // Enlaces seguros con estilo destacado
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold underline hover:opacity-80 transition-opacity"
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessageContent;
