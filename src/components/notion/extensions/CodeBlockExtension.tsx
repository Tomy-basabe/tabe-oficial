import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Copy, Check } from "lucide-react";
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
];

function CodeBlockView({ node, updateAttributes, extension }: any) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const language = node.attrs.language || "plain";

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
    <NodeViewWrapper className="code-block-wrapper">
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

      {/* Code content */}
      <pre>
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
