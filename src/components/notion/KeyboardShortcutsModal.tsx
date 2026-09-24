/**
 * KeyboardShortcutsModal — Panel visual de atajos estilo Notion
 * Se abre con Ctrl+/ o desde el menú, mostrando todos los atajos organizados por categoría.
 */
import { useState, useEffect, useMemo } from "react";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shortcut {
    keys: string[];
    description: string;
}

interface ShortcutCategory {
    name: string;
    shortcuts: Shortcut[];
}

const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
const mod = isMac ? "⌘" : "Ctrl";
const opt = isMac ? "⌥" : "Alt";
const shift = isMac ? "⇧" : "Shift";

const shortcutCategories: ShortcutCategory[] = [
    {
        name: "Esenciales",
        shortcuts: [
            { keys: [mod, "N"], description: "Crear nueva página" },
            { keys: [mod, "/"], description: "Abrir atajos de teclado" },
            { keys: [mod, "K"], description: "Insertar enlace" },
            { keys: [mod, "Z"], description: "Deshacer" },
            { keys: [mod, shift, "Z"], description: "Rehacer" },
            { keys: [mod, "D"], description: "Duplicar bloque" },
            { keys: ["Esc"], description: "Deseleccionar / cerrar menú" },
        ],
    },
    {
        name: "Formato de Texto",
        shortcuts: [
            { keys: [mod, "B"], description: "Negrita" },
            { keys: [mod, "I"], description: "Cursiva" },
            { keys: [mod, "U"], description: "Subrayado" },
            { keys: [mod, shift, "S"], description: "Tachado" },
            { keys: [mod, "E"], description: "Código inline" },
            { keys: [mod, shift, "H"], description: "Resaltar" },
        ],
    },
    {
        name: "Tipos de Bloque",
        shortcuts: [
            { keys: [mod, shift, "0"], description: "Texto normal" },
            { keys: [mod, shift, "1"], description: "Encabezado 1" },
            { keys: [mod, shift, "2"], description: "Encabezado 2" },
            { keys: [mod, shift, "3"], description: "Encabezado 3" },
            { keys: [mod, shift, "4"], description: "Lista de tareas" },
            { keys: [mod, shift, "5"], description: "Lista con viñetas" },
            { keys: [mod, shift, "6"], description: "Lista numerada" },
            { keys: [mod, shift, "7"], description: "Toggle (colapsable)" },
            { keys: [mod, shift, "8"], description: "Bloque de código" },
            { keys: [mod, shift, "9"], description: "Cita / Blockquote" },
        ],
    },
    {
        name: "Atajos Markdown",
        shortcuts: [
            { keys: ["#", "espacio"], description: "Encabezado 1" },
            { keys: ["##", "espacio"], description: "Encabezado 2" },
            { keys: ["###", "espacio"], description: "Encabezado 3" },
            { keys: ["-", "espacio"], description: "Lista con viñetas" },
            { keys: ["1.", "espacio"], description: "Lista numerada" },
            { keys: ["[]", "espacio"], description: "Lista de tareas" },
            { keys: [">", "Enter"], description: "Toggle" },
            { keys: ["```", "Enter"], description: "Bloque de código" },
            { keys: ["---", "espacio"], description: "Línea divisora" },
            { keys: ['"', "espacio"], description: "Cita" },
            { keys: ["/"], description: "Abrir menú de comandos" },
        ],
    },
    {
        name: "Navegación y Bloques",
        shortcuts: [
            { keys: ["Tab"], description: "Indentar bloque" },
            { keys: [shift, "Tab"], description: "Des-indentar bloque" },
            { keys: ["Enter"], description: "Nuevo bloque" },
            { keys: [shift, "Enter"], description: "Salto de línea" },
            { keys: [mod, shift, "↑"], description: "Mover bloque arriba" },
            { keys: [mod, shift, "↓"], description: "Mover bloque abajo" },
        ],
    },
    {
        name: "Alineación",
        shortcuts: [
            { keys: [mod, shift, "L"], description: "Alinear izquierda" },
            { keys: [mod, shift, "E"], description: "Centrar" },
            { keys: [mod, shift, "R"], description: "Alinear derecha" },
        ],
    },
];

interface KeyboardShortcutsModalProps {
    open: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Filter shortcuts
    const filtered = useMemo(() => {
        if (!search) return shortcutCategories;
        const q = search.toLowerCase();
        return shortcutCategories
            .map((cat) => ({
                ...cat,
                shortcuts: cat.shortcuts.filter(
                    (s) =>
                        s.description.toLowerCase().includes(q) ||
                        s.keys.join(" ").toLowerCase().includes(q)
                ),
            }))
            .filter((cat) => cat.shortcuts.length > 0);
    }, [search]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] max-h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl"
                style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ borderColor: "hsl(var(--border))" }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: "hsl(var(--primary) / 0.15)" }}
                        >
                            <Keyboard className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                            Atajos de Teclado
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "hsl(var(--secondary))")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                    <input
                        type="text"
                        placeholder="Buscar atajos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                        style={{
                            background: "hsl(var(--secondary))",
                            color: "hsl(var(--foreground))",
                            border: "none",
                        }}
                    />
                </div>

                {/* Category tabs */}
                <div className="flex gap-1 px-5 py-2 overflow-x-auto border-b"
                    style={{ borderColor: "hsl(var(--border) / 0.5)" }}
                >
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={cn(
                            "px-3 py-1.5 text-xs rounded-lg whitespace-nowrap font-medium transition-all",
                            !activeCategory ? "text-white" : ""
                        )}
                        style={
                            !activeCategory
                                ? { background: "hsl(var(--primary))" }
                                : { color: "hsl(var(--muted-foreground))" }
                        }
                        onMouseOver={(e) => {
                            if (activeCategory) e.currentTarget.style.background = "hsl(var(--secondary))";
                        }}
                        onMouseOut={(e) => {
                            if (activeCategory) e.currentTarget.style.background = "transparent";
                        }}
                    >
                        Todos
                    </button>
                    {shortcutCategories.map((cat) => (
                        <button
                            key={cat.name}
                            onClick={() => setActiveCategory(cat.name)}
                            className={cn(
                                "px-3 py-1.5 text-xs rounded-lg whitespace-nowrap font-medium transition-all",
                                activeCategory === cat.name ? "text-white" : ""
                            )}
                            style={
                                activeCategory === cat.name
                                    ? { background: "hsl(var(--primary))" }
                                    : { color: "hsl(var(--muted-foreground))" }
                            }
                            onMouseOver={(e) => {
                                if (activeCategory !== cat.name) e.currentTarget.style.background = "hsl(var(--secondary))";
                            }}
                            onMouseOut={(e) => {
                                if (activeCategory !== cat.name) e.currentTarget.style.background = "transparent";
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Shortcuts list */}
                <div className="flex-1 overflow-y-auto px-5 py-3" style={{ minHeight: 200 }}>
                    {filtered
                        .filter((cat) => !activeCategory || cat.name === activeCategory)
                        .map((cat) => (
                            <div key={cat.name} className="mb-5">
                                <h3
                                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                                    style={{ color: "hsl(var(--muted-foreground))" }}
                                >
                                    {cat.name}
                                </h3>
                                <div className="space-y-1">
                                    {cat.shortcuts.map((shortcut, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors"
                                            onMouseOver={(e) => (e.currentTarget.style.background = "hsl(var(--secondary) / 0.5)")}
                                            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                                        >
                                            <span
                                                className="text-sm"
                                                style={{ color: "hsl(var(--foreground))" }}
                                            >
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {shortcut.keys.map((key, j) => (
                                                    <span key={j}>
                                                        {j > 0 && (
                                                            <span
                                                                className="text-xs mx-0.5"
                                                                style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}
                                                            >
                                                                +
                                                            </span>
                                                        )}
                                                        <kbd
                                                            className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-xs font-mono font-medium"
                                                            style={{
                                                                background: "hsl(var(--secondary))",
                                                                color: "hsl(var(--foreground))",
                                                                border: "1px solid hsl(var(--border))",
                                                                boxShadow: "0 1px 2px hsl(var(--background) / 0.3)",
                                                            }}
                                                        >
                                                            {key}
                                                        </kbd>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                    {filtered.length === 0 && (
                        <p
                            className="text-center py-8 text-sm"
                            style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                            No se encontraron atajos para "{search}"
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="px-5 py-3 border-t flex items-center justify-between text-xs"
                    style={{
                        borderColor: "hsl(var(--border) / 0.5)",
                        color: "hsl(var(--muted-foreground))",
                    }}
                >
                    <span>Tip: Escribe <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>/</kbd> en el editor para ver comandos</span>
                    <span>
                        <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>Esc</kbd> para cerrar
                    </span>
                </div>
            </div>
        </>
    );
}
