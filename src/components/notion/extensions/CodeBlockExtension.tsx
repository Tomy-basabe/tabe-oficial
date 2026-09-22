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
      },
    });
    mermaidInitialized = true;
  }
  return mermaidInstance;
}

// Mermaid preview component
function MermaidPreview({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
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

        // Clean code: strip markdown code block fences if present
        let cleanCode = code.trim();
        cleanCode = cleanCode.replace(/^```(?:mermaid)?\s*\n?/i, '');
        cleanCode = cleanCode.replace(/\n?```\s*$/i, '');
        // Remove trailing commas on line endings (common paste artifact)
        cleanCode = cleanCode
          .split('\n')
          .map(line => line.replace(/,\s*$/, ''))
          .join('\n')
          .trim();

        // Render sequentially in an isolated offscreen container to prevent DOM conflicts
        const renderedSvg = await runInMermaidQueue(async () => {
          const tempContainer = document.createElement("div");
          tempContainer.id = "c_" + id;
          tempContainer.style.position = "absolute";
          tempContainer.style.top = "-9999px";
          tempContainer.style.left = "-9999px";
          tempContainer.style.visibility = "hidden";
          document.body.appendChild(tempContainer);

          try {
            const result = await mermaid.render(id, cleanCode, tempContainer);
            return result.svg;
          } finally {
            tempContainer.remove();
          }
        });

        if (isMountedRef.current) {
          setSvg(renderedSvg);
          setError("");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        if (isMountedRef.current) {
          setSvg("");
          setError(err?.message || "Error al renderizar diagrama");
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(render, 150);
    return () => clearTimeout(timer);
  }, [code]);

  if (error) {
    return (
      <div className="mermaid-error" contentEditable={false}>
        <div className="font-semibold text-rose-400">⚠️ Error en diagrama Mermaid</div>
        <small>{error}</small>
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

  const textContent = node.textContent?.trim() || "";
  const isMermaidSyntax = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline)\b/i.test(textContent);
  const isMermaid = language === "mermaid" || (language === "plain" && isMermaidSyntax);

  // Auto-set language to mermaid if detected syntax in plain block
  useEffect(() => {
    if (language === "plain" && isMermaidSyntax) {
      updateAttributes({ language: "mermaid" });
    }
  }, [language, isMermaidSyntax, updateAttributes]);

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
              title={showMermaidCode ? "Ver diagrama" : "Ver código"}
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
        <MermaidPreview code={node.textContent} />
      )}

      {/* Code content - hidden when showing mermaid preview */}
      <pre style={isMermaid && !showMermaidCode ? { height: 0, overflow: "hidden", margin: 0, padding: 0 } : undefined}>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/**
 * Custom input rule for +++ to create a code block.
 * Matches: type "+++" at the start of a line, then press Space or Enter.
 */
const plusPlusPlusInputRegex = /^\+\+\+\s$/;

export const CustomCodeBlock = (lowlight: any) =>
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView);
    },

    addInputRules() {
      return [
        // Keep default ``` input rule
        textblockTypeInputRule({
          find: /^```([a-z]*)[\s\n]$/,
          type: this.type,
          getAttributes: (match) => ({
            language: match[1] || "plain",
          }),
        }),
        // Add +++ input rule
        textblockTypeInputRule({
          find: plusPlusPlusInputRegex,
          type: this.type,
          getAttributes: () => ({
            language: "plain",
          }),
        }),
      ];
    },
  }).configure({
    lowlight,
    defaultLanguage: "plain",
  });
