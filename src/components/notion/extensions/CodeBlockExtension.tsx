import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Copy, Check, Eye, Code2 } from "lucide-react";
import { textblockTypeInputRule } from "@tiptap/core";

// Language list with display names (matching Notion/VS Code style)
const LANGUAGES = [
  { value: "plain", label: "Texto plano" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
  { value: "r", label: "R" },
  { value: "lua", label: "Lua" },
  { value: "perl", label: "Perl" },
  { value: "scala", label: "Scala" },
  { value: "dart", label: "Dart" },
  { value: "objectivec", label: "Objective-C" },
  { value: "ini", label: "INI" },
  { value: "makefile", label: "Makefile" },
  { value: "diff", label: "Diff" },
  { value: "wasm", label: "WebAssembly" },
  { value: "mermaid", label: "Mermaid" },
];

// Lazy-loaded mermaid renderer
// Sequential queue to guarantee mermaid renders never conflict in the DOM
let mermaidRenderQueue = Promise.resolve();
function runInMermaidQueue<T>(task: () => Promise<T>): Promise<T> {
  const next = mermaidRenderQueue.then(task, task);
  mermaidRenderQueue = next.catch(() => {}) as Promise<any>;
  return next;
}

// Lazy-loaded mermaid renderer
let mermaidInstance: any = null;
let mermaidInitialized = false;

async function getMermaid() {
  if (!mermaidInstance) {
    const m = await import("mermaid");
    mermaidInstance = m.default;
  }
  if (!mermaidInitialized) {
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      suppressErrorRendering: true,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: 13,
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
      },
      themeVariables: {
        darkMode: true,
        background: "#18181b",
        mainBkg: "#27272a",
        nodeBorder: "#52525b",
        textColor: "#f4f4f5",
        lineColor: "#9ca3af",
        edgeLabelBackground: "#18181b",
        primaryColor: "#27272a",
        primaryTextColor: "#f4f4f5",
        primaryBorderColor: "#52525b",
        secondaryColor: "#1f1f23",
        tertiaryColor: "#18181b",
        nodeTextColor: "#f4f4f5",
        clusterBkg: "#1f1f23",
        clusterBorder: "#3f3f46",
        titleColor: "#f4f4f5",
        fontSize: "13px",
      },
    });
    mermaidInitialized = true;
  }
  return mermaidInstance;
}

/**
 * Sanitizes and normalizes Mermaid syntax so that user-edited or pasted text
 * containing special characters (parentheses, dots, colons, question marks, commas)
 * does not trigger parser syntax errors.
 */
export function sanitizeMermaidCode(raw: string): string {
  if (!raw) return "";

  // 1. Strip markdown code block fences if present
  let code = raw.trim();
  code = code.replace(/^```(?:mermaid)?\s*\n?/i, "");
  code = code.replace(/\n?```\s*$/i, "");

  // 2. Process line by line
  const lines = code.split("\n");
  const processed = lines.map((line) => {
    // Remove trailing commas on line endings (common paste artifact, e.g. D -->|No| B,)
    let l = line.replace(/,\s*$/, "");

    // Skip directive or flowchart declaration lines
    if (
      /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline|subgraph|end)\b/i.test(
        l
      )
    ) {
      return l;
    }

    const nodePrefix =
      '(^|;|\\&|[-=.]{2,}>?|[-=.]{1,2}\\.[-=.]{1,2}>?)(?:\\s*\\|[^|\\r\\n]*\\|)?\\s*';

    // Stadium: ID([ ... ])
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\(\\s*\\[\\s*(?!")(.*?)(?<!")\\s*\\]\\s*\\)`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\(\\s*\\[\\s*(?!")(.*?)(?<!")\\s*\\]\\s*\\)`),
          `${id}(["${content.replace(/"/g, "'")}"])`
        );
      }
    );

    // Subroutine: ID[[ ... ]]
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\[\\s*\\[\\s*(?!")(.*?)(?<!")\\s*\\]\\s*\\]`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\[\\s*\\[\\s*(?!")(.*?)(?<!")\\s*\\]\\s*\\]`),
          `${id}[["${content.replace(/"/g, "'")}"]]`
        );
      }
    );

    // Hexagon: ID{{ ... }}
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\{\\s*\\{\\s*(?!")(.*?)(?<!")\\s*\\}\\s*\\}`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\{\\s*\\{\\s*(?!")(.*?)(?<!")\\s*\\}\\s*\\}`),
          `${id}{{"${content.replace(/"/g, "'")}}"}}`
        );
      }
    );

    // Circle: ID(( ... ))
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\(\\s*\\(\\s*(?!")(.*?)(?<!")\\s*\\)\\s*\\)`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\(\\s*\\(\\s*(?!")(.*?)(?<!")\\s*\\)\\s*\\)`),
          `${id}(("${content.replace(/"/g, "'")}"))`
        );
      }
    );

    // Rhombus / Decision: ID{ ... }
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\{\\s*(?![{"])(.*?)(?<![}"])\\s*\\}`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\{\\s*(?![{"])(.*?)(?<![}"])\\s*\\}`),
          `${id}{"${content.replace(/"/g, "'")}"}`
        );
      }
    );

    // Standard Rect: ID[ ... ]
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\[\\s*(?![\\["])(.*?)(?<![\\]"])\\s*\\]`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\[\\s*(?![\\["])(.*?)(?<![\\]"])\\s*\\]`),
          `${id}["${content.replace(/"/g, "'")}"]`
        );
      }
    );

    // Rounded Rect: ID( ... )
    l = l.replace(
      new RegExp(`${nodePrefix}([A-Za-z0-9_-]+)\\s*\\(\\s*(?![([|"])(.*?)(?<![)|"])\\s*\\)`, "g"),
      (match, prefix, id, content) => {
        return match.replace(
          new RegExp(`([A-Za-z0-9_-]+)\\s*\\(\\s*(?![([|"])(.*?)(?<![)|"])\\s*\\)`),
          `${id}("${content.replace(/"/g, "'")}")`
        );
      }
    );

    return l;
  });

  return processed.join("\n").trim();
}

// Mermaid preview component
function MermaidPreview({
  code,
  onEditCode,
}: {
  code: string;
  onEditCode?: () => void;
}) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const lastValidSvgRef = useRef<string>("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!code || !code.trim()) {
      setSvg("");
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);

    const render = async () => {
      try {
        const mermaid = await getMermaid();
        // Safe identifier for CSS and D3 query selectors
        const id = `mmd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        const cleanCode = sanitizeMermaidCode(code);

        // Render sequentially in an isolated offscreen container to prevent DOM conflicts
        const renderedSvg = await runInMermaidQueue(async () => {
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
            const result = await mermaid.render(id, cleanCode, tempContainer);
            return result.svg;
          } finally {
            tempContainer.remove();
          }
        });

        if (isMountedRef.current) {
          lastValidSvgRef.current = renderedSvg;
          setSvg(renderedSvg);
          setError("");
          setLoading(false);
        }
      } catch (err: any) {
        console.warn("Mermaid render error:", err);
        if (isMountedRef.current) {
          setError(err?.message || "Error al renderizar diagrama");
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(render, 400);
    return () => clearTimeout(timer);
  }, [code]);

  // If there's an error but we have a previously valid render, show the valid diagram with a warning banner
  if (error && lastValidSvgRef.current) {
    return (
      <div className="mermaid-wrapper-with-fallback" contentEditable={false}>
        <div className="mermaid-error-banner flex items-center justify-between text-xs">
          <span>⚠️ Error de sintaxis en la edición. Mostrando última versión válida.</span>
          {onEditCode && (
            <button
              type="button"
              onClick={onEditCode}
              className="text-xs underline hover:text-amber-300 ml-2 font-medium"
            >
              Corregir código
            </button>
          )}
        </div>
        <div
          className="mermaid-rendered opacity-90"
          dangerouslySetInnerHTML={{ __html: lastValidSvgRef.current }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mermaid-error" contentEditable={false}>
        <div className="font-semibold text-rose-400">⚠️ Error de sintaxis en diagrama Mermaid</div>
        <small>{error}</small>
        <div className="text-xs text-rose-300/70 mt-1">
          💡 Consejo: Si agregás textos con paréntesis, puntos o signos, asegúrate de encerrarlos entre comillas dobles. Ejemplo: <code className="bg-rose-950/60 px-1 py-0.5 rounded text-rose-200">A["Texto (con detalle)"]</code>
        </div>
        {onEditCode && (
          <button
            type="button"
            onClick={onEditCode}
            className="mt-2 text-xs text-left text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Editar código del diagrama →
          </button>
        )}
      </div>
    );
  }

  if (loading && !svg) {
    return (
      <div className="mermaid-loading" contentEditable={false}>
        <span>Cargando diagrama...</span>
      </div>
    );
  }

  return (
    <div
      className="mermaid-rendered"
      contentEditable={false}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function CodeBlockView({ node, updateAttributes, extension }: any) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [showMermaidCode, setShowMermaidCode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const language = node.attrs.language || "plain";

  const isMermaid = language === "mermaid";

  // Auto-detectar diagramas Mermaid solo si se pega o escribe una cabecera explícita (flowchart TD, etc.)
  // con debounce para no re-renderizar ni trabar la escritura de código normal
  useEffect(() => {
    if (language === "plain") {
      const text = node.textContent || "";
      if (text.length > 8 && text.length < 500) {
        const firstLine = text.trimStart().split("\n")[0]?.trim() || "";
        if (/^(flowchart\s+(TD|TB|BT|RL|LR)|sequenceDiagram|classDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline)\b/i.test(firstLine)) {
          const timer = setTimeout(() => {
            updateAttributes({ language: "mermaid" });
          }, 600);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [language, node.textContent, updateAttributes]);

  const currentLabel =
    LANGUAGES.find((l) => l.value === language)?.label || language || "Texto plano";

  const filteredLanguages = LANGUAGES.filter((l) =>
    l.label.toLowerCase().includes(search.toLowerCase()) ||
    l.value.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSearch("");
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showDropdown && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showDropdown]);

  const selectLanguage = useCallback((value: string) => {
    updateAttributes({ language: value });
    setShowDropdown(false);
    setSearch("");
  }, [updateAttributes]);

  const handleCopy = useCallback(() => {
    const text = node.textContent;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [node]);

  return (
    <NodeViewWrapper className={`code-block-wrapper ${isMermaid ? "code-block-mermaid" : ""}`}>
      {/* Header bar */}
      <div className="code-block-header" contentEditable={false}>
        <div className="code-block-lang-selector" ref={dropdownRef}>
          <button
            className="code-block-lang-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            type="button"
          >
            <span>{currentLabel}</span>
            <ChevronDown className="code-block-lang-chevron" />
          </button>

          {showDropdown && (
            <div className="code-block-lang-dropdown">
              <input
                ref={searchRef}
                className="code-block-lang-search"
                type="text"
                placeholder="Buscar lenguaje..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredLanguages.length > 0) {
                    selectLanguage(filteredLanguages[0].value);
                  }
                  if (e.key === "Escape") {
                    setShowDropdown(false);
                    setSearch("");
                  }
                }}
              />
              <div className="code-block-lang-list">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.value}
                    className={`code-block-lang-option ${lang.value === language ? "active" : ""}`}
                    onClick={() => selectLanguage(lang.value)}
                    type="button"
                  >
                    {lang.label}
                  </button>
                ))}
                {filteredLanguages.length === 0 && (
                  <div className="code-block-lang-empty">Sin resultados</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="code-block-header-actions">
          {isMermaid && (
            <button
              className="code-block-copy-btn"
              onClick={() => setShowMermaidCode(!showMermaidCode)}
              title={showMermaidCode ? "Ver solo diagrama" : "Editar código"}
              type="button"
            >
              {showMermaidCode ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <Code2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            className="code-block-copy-btn"
            onClick={handleCopy}
            title="Copiar código"
            type="button"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Mermaid preview */}
      {isMermaid && !showMermaidCode && (
        <MermaidPreview
          code={node.textContent}
          onEditCode={() => setShowMermaidCode(true)}
        />
      )}

      {/* Code content - hidden when showing mermaid preview */}
      <pre style={isMermaid && !showMermaidCode ? { height: 0, overflow: "hidden", margin: 0, padding: 0 } : undefined}>
        <NodeViewContent as="code" />
      </pre>

      {/* Mermaid live preview while editing */}
      {isMermaid && showMermaidCode && (
        <div className="mermaid-live-preview-container" contentEditable={false}>
          <div className="mermaid-live-preview-header">
            <span>Vista previa en vivo</span>
          </div>
          <MermaidPreview
            code={node.textContent}
            onEditCode={() => setShowMermaidCode(true)}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}

/**
 * Custom input rule for +++ to create a code block.
 * Matches: type "+++" at the start of a line, then press Space or Enter.
 */
const plusPlusPlusInputRegex = /^\+\+\+[\s\n]$/;

export const CustomCodeBlock = (lowlight: any) => {
  // Asegurar que las fuentes comunes y texto plano estén mapeadas sin activar highlightAuto
  if (lowlight && typeof lowlight.registerAlias === "function") {
    lowlight.registerAlias({
      plaintext: ["plain", "mermaid", "text", "txt", "scala", "dart"],
      bash: ["powershell", "shell", "dockerfile"],
    });
  }

  return CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView);
    },

    addInputRules() {
      return [
        // Mantener regla por defecto ```
        textblockTypeInputRule({
          find: /^```([a-z]*)[\s\n]$/,
          type: this.type,
          getAttributes: (match) => ({
            language: match[1] || "plain",
          }),
        }),
        // Regla instantánea para +++
        textblockTypeInputRule({
          find: plusPlusPlusInputRegex,
          type: this.type,
          getAttributes: () => ({
            language: "plain",
          }),
        }),
      ];
    },

    addKeyboardShortcuts() {
      return {
        ...this.parent?.(),
        // Atajo instantáneo: al escribir +++ y presionar Enter
        Enter: ({ editor }) => {
          const { state } = editor;
          const { selection } = state;
          const { $from } = selection;

          // 1. Si estamos en un párrafo que contiene exactamente "+++" o "```"
          if ($from.parent.type.name === "paragraph") {
            const lineText = $from.parent.textContent.trim();
            if (lineText === "+++" || lineText === "```") {
              return editor
                .chain()
                .focus()
                .command(({ tr, dispatch }) => {
                  if (dispatch) {
                    const from = $from.before();
                    const to = $from.after();
                    tr.replaceWith(from, to, this.type.create({ language: "plain" }));
                  }
                  return true;
                })
                .run();
            }
          }

          // 2. Si ya estamos dentro del bloque de código: nueva línea nativa inmediata
          if ($from.parent.type.name === this.name) {
            return editor.commands.newlineInCode();
          }

          return false;
        },
      };
    },
  }).configure({
    lowlight,
    defaultLanguage: "plain",
  });
};
