import { useState } from "react";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutCategory {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: "Bloques",
    shortcuts: [
      { keys: "Ctrl/⌘ + Alt/⇧ + 0", description: "Texto normal" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 1", description: "Encabezado 1" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 2", description: "Encabezado 2" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 3", description: "Encabezado 3" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 4", description: "Lista de tareas" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 5", description: "Lista con viñetas" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 6", description: "Lista numerada" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 7", description: "Toggle list" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 8", description: "Bloque de código" },
      { keys: "Ctrl/⌘ + Alt/⇧ + 9", description: "Cita" },
    ],
  },
  {
    title: "Formato de texto",
    shortcuts: [
      { keys: "Ctrl/⌘ + B", description: "Negrita" },
      { keys: "Ctrl/⌘ + I", description: "Cursiva" },
      { keys: "Ctrl/⌘ + U", description: "Subrayado" },
      { keys: "Ctrl/⌘ + Shift + S", description: "Tachado" },
      { keys: "Ctrl/⌘ + E", description: "Código inline" },
      { keys: "Ctrl/⌘ + Shift + H", description: "Resaltar" },
      { keys: "Ctrl/⌘ + K", description: "Añadir enlace" },
    ],
  },
  {
    title: "Markdown (escribir + espacio)",
    shortcuts: [
      { keys: "#", description: "Encabezado 1" },
      { keys: "##", description: "Encabezado 2" },
      { keys: "###", description: "Encabezado 3" },
      { keys: "- o * o +", description: "Lista con viñetas" },
      { keys: "1. o a. o i.", description: "Lista numerada" },
      { keys: "[]", description: "Lista de tareas" },
      { keys: ">", description: "Toggle list" },
      { keys: '"', description: "Cita" },
      { keys: "---", description: "Divisor" },
      { keys: "```", description: "Bloque de código" },
    ],
  },
  {
    title: "Navegación y edición",
    shortcuts: [
      { keys: "Tab", description: "Indentar bloque" },
      { keys: "Shift + Tab", description: "Desindentar bloque" },
      { keys: "Ctrl/⌘ + Z", description: "Deshacer" },
      { keys: "Ctrl/⌘ + Shift + Z", description: "Rehacer" },
      { keys: "Ctrl/⌘ + D", description: "Duplicar" },
      { keys: "Ctrl/⌘ + S", description: "Guardar" },
      { keys: "Esc", description: "Deseleccionar" },
      { keys: "/", description: "Menú de comandos" },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  className?: string;
}

export function KeyboardShortcutsHelp({ className }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "p-1.5 rounded transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground",
          className
        )}
        title="Atajos de teclado"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[80vh] overflow-hidden bg-card border border-border rounded-2xl shadow-xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Atajos de teclado</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-70px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shortcutCategories.map((category) => (
                  <div key={category.title}>
                    <h3 className="text-sm font-semibold text-primary mb-3">
                      {category.title}
                    </h3>
                    <div className="space-y-2">
                      {category.shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.description}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {shortcut.description}
                          </span>
                          <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono whitespace-nowrap">
                            {shortcut.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Tip:</strong> En Mac usa ⌘ (Command) y ⌥ (Option). En Windows/Linux usa Ctrl y Shift.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
