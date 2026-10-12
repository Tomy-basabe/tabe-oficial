import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

/**
 * Normaliza y preprocesa fórmulas LaTeX y tablas de Markdown generadas por la IA
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

    // 1. Asegurar salto de línea antes de tablas Markdown (| Col | Col |) para que remark-gfm las detecte
    text = text.replace(/([^\n])\n(\|.*?\|)\n/g, "$1\n\n$2\n");

    // 2. Convertir bloques matemáticos LaTeX \[ ... \] a $$ ... $$
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
      return `\n$$\n${math.trim()}\n$$\n`;
    });

    // 3. Convertir fórmulas en línea \( ... \) a $ ... $
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
      return `$${math.trim()}$`;
    });

    // 4. Envolver entornos comunes de LaTeX (\begin{aligned}...\end{aligned}, matrices, casos) en $$ si no lo están
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
          // Listas con espaciado limpio
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1">
              {children}
            </ol>
          ),
          // Imágenes embebidas / generadas por la IA con sanitización y calidad Flux
          img: ({ src, alt, ...props }: any) => {
            // Asegurar que si es Pollinations tenga siempre nologo=true y model=flux
            let cleanSrc = src || "";
            if (cleanSrc.includes("pollinations.ai")) {
              if (!cleanSrc.includes("nologo=true")) {
                cleanSrc += (cleanSrc.includes("?") ? "&" : "?") + "nologo=true";
              }
              if (!cleanSrc.includes("model=")) {
                cleanSrc += "&model=flux";
              }
            }

            return (
              <div className="my-3.5 max-w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md bg-zinc-950/5 group relative">
                <img
                  src={cleanSrc}
                  alt={alt || "Ilustración generada"}
                  loading="lazy"
                  className="w-full max-h-[520px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                  {...props}
                />
                <div className="px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xs">
                  <span className="truncate">{alt || "Ilustración de alta fidelidad (Flux)"}</span>
                  <a
                    href={cleanSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors underline font-mono text-[10px]"
                  >
                    Abrir HD ↗
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
