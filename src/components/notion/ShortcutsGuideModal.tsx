import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Keyboard,
  Search,
  Type,
  List,
  Table as TableIcon,
  Sigma,
  Sparkles,
  AlignLeft,
  FileText,
  Sliders,
  Maximize2,
  Printer,
  Compass,
} from 'lucide-react';

interface ShortcutItem {
  title: string;
  keys: string[];
  description: string;
  category: 'word' | 'slash' | 'markdown' | 'navigation';
  tag?: string;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // --- WORD Y FORMATO ---
  {
    title: 'Negrita',
    keys: ['Ctrl', 'B'],
    description: 'Aplica o quita el estilo de negrita al texto seleccionado.',
    category: 'word',
  },
  {
    title: 'Cursiva',
    keys: ['Ctrl', 'I'],
    description: 'Aplica o quita el estilo itálica/cursiva.',
    category: 'word',
  },
  {
    title: 'Subrayado',
    keys: ['Ctrl', 'U'],
    description: 'Subraya el texto seleccionado.',
    category: 'word',
  },
  {
    title: 'Color de Texto Rápido',
    keys: ['Ctrl', 'S'],
    description: 'Aplica el último color seleccionado al texto marcado.',
    category: 'word',
    tag: 'Word',
  },
  {
    title: 'Resaltador de Estudio',
    keys: ['Ctrl', 'Shift', 'H'],
    description: 'Aplica el resaltado de estudio con color amarillo pastel.',
    category: 'word',
    tag: 'Estudio',
  },
  {
    title: 'Subíndice',
    keys: ['Subíndice en Barra'],
    description: 'Para fórmulas químicas como H₂O o variables numéricas.',
    category: 'word',
    tag: 'Química',
  },
  {
    title: 'Superíndice',
    keys: ['Superíndice en Barra'],
    description: 'Para potencias matemáticas como x², metros cúbicos m³.',
    category: 'word',
    tag: 'Matemática',
  },
  {
    title: 'Alinear a la Izquierda',
    keys: ['Ctrl', 'Shift', 'L'],
    description: 'Alinea el texto a la izquierda.',
    category: 'word',
  },
  {
    title: 'Centrar Texto',
    keys: ['Ctrl', 'Shift', 'E'],
    description: 'Centra títulos o párrafos en la página.',
    category: 'word',
  },
  {
    title: 'Alinear a la Derecha',
    keys: ['Ctrl', 'Shift', 'R'],
    description: 'Alinea fechas, firmas o anotaciones a la derecha.',
    category: 'word',
  },
  {
    title: 'Justificar Párrafo',
    keys: ['Botón Justificar'],
    description: 'Distribuye el texto uniformemente entre márgenes como en Word.',
    category: 'word',
    tag: 'A4',
  },
  {
    title: 'Aumentar Sangría',
    keys: ['Tab'],
    description: 'Indenta el bloque o lista hacia la derecha.',
    category: 'word',
  },
  {
    title: 'Reducir Sangría',
    keys: ['Shift', 'Tab'],
    description: 'Quita nivel de sangría hacia la izquierda.',
    category: 'word',
  },

  // --- COMANDOS SLASH (NOTION) ---
  {
    title: 'Menú de Comandos',
    keys: ['/'],
    description: 'Escribe "/" al inicio o en cualquier línea para desplegar todos los bloques.',
    category: 'slash',
    tag: 'Principal',
  },
  {
    title: 'Título Principal (H1)',
    keys: ['/h1', 'o', '# + Espacio'],
    description: 'Crea un encabezado de primer nivel para temas principales.',
    category: 'slash',
  },
  {
    title: 'Sección (H2)',
    keys: ['/h2', 'o', '## + Espacio'],
    description: 'Crea un subtítulo de segundo nivel para capítulos.',
    category: 'slash',
  },
  {
    title: 'Subsección (H3)',
    keys: ['/h3', 'o', '### + Espacio'],
    description: 'Crea un título de tercer nivel para apartados.',
    category: 'slash',
  },
  {
    title: 'Lista de Tareas (To-Do)',
    keys: ['/todo', 'o', '[] + Espacio'],
    description: 'Casilla interactiva para marcar pendientes completados.',
    category: 'slash',
  },
  {
    title: 'Lista con Viñetas',
    keys: ['/viñeta', 'o', '- + Espacio'],
    description: 'Crea una lista desordenada con puntos limpios.',
    category: 'slash',
  },
  {
    title: 'Lista Numerada',
    keys: ['/numero', 'o', '1. + Espacio'],
    description: 'Crea una lista ordenada secuencial.',
    category: 'slash',
  },
  {
    title: 'Desplegable (Toggle List)',
    keys: ['/desplegable', 'o', '> + Enter'],
    description: 'Caja colapsable ideal para ocultar preguntas y respuestas de estudio.',
    category: 'slash',
    tag: 'Estudio',
  },
  {
    title: 'Nota Destacada (Callout)',
    keys: ['/callout', 'o', '/nota'],
    description: 'Caja con emoji y fondo suave para ideas clave, advertencias o tips.',
    category: 'slash',
  },
  {
    title: 'Fórmula Matemática (KaTeX)',
    keys: ['/math', 'o', 'Ctrl + M'],
    description: 'Inserta ecuaciones avanzadas en formato LaTeX con editor en vivo.',
    category: 'slash',
    tag: 'Ciencias',
  },
  {
    title: 'Gráfico Interactivo',
    keys: ['/grafico', 'o', 'Ctrl + Shift + L'],
    description: 'Crea gráficos de barras, líneas o torta interactivos en el apunte.',
    category: 'slash',
    tag: 'Visual',
  },
  {
    title: 'Tabla de Datos',
    keys: ['/tabla'],
    description: 'Inserta una tabla con filas, columnas y encabezados configurables.',
    category: 'slash',
  },
  {
    title: 'Subpágina de Apunte',
    keys: ['/pagina', 'o', '/subpagina'],
    description: 'Crea una página anidada dentro de este apunte para organizar temas.',
    category: 'slash',
    tag: 'Organización',
  },
  {
    title: 'Bloque de Código',
    keys: ['/codigo', 'o', '``` + Enter'],
    description: 'Bloque con resaltado de sintaxis para programación.',
    category: 'slash',
  },
  {
    title: 'Cita Académica',
    keys: ['/cita', 'o', '"" + Espacio'],
    description: 'Bloque de cita con borde lateral elegante.',
    category: 'slash',
  },
  {
    title: 'Línea Separadora',
    keys: ['/divisor', 'o', '--- + Espacio'],
    description: 'Inserta una línea horizontal para separar temas.',
    category: 'slash',
  },
  {
    title: 'Columnas',
    keys: ['/2col', 'o', '/3col'],
    description: 'Organiza el apunte en 2 o 3 columnas paralelas.',
    category: 'slash',
  },

  // --- NAVEGACIÓN Y HERRAMIENTAS ---
  {
    title: 'Buscar y Reemplazar',
    keys: ['Ctrl', 'F'],
    description: 'Abre la herramienta de búsqueda y reemplazo masivo de palabras.',
    category: 'navigation',
    tag: 'Productividad',
  },
  {
    title: 'Imprimir / Exportar a PDF',
    keys: ['Ctrl', 'P'],
    description: 'Genera un documento limpio con márgenes de hoja A4 sin elementos de la interfaz.',
    category: 'navigation',
    tag: 'PDF',
  },
  {
    title: 'Deshacer Acción',
    keys: ['Ctrl', 'Z'],
    description: 'Revierte el último cambio realizado.',
    category: 'navigation',
  },
  {
    title: 'Rehacer Acción',
    keys: ['Ctrl', 'Y'],
    description: 'Vuelve a aplicar el cambio revertido.',
    category: 'navigation',
  },
  {
    title: 'Mover Bloque hacia Arriba',
    keys: ['Ctrl', 'Shift', '↑'],
    description: 'Mueve el párrafo o elemento seleccionado un renglón hacia arriba.',
    category: 'navigation',
  },
  {
    title: 'Mover Bloque hacia Abajo',
    keys: ['Ctrl', 'Shift', '↓'],
    description: 'Mueve el párrafo o elemento seleccionado un renglón hacia abajo.',
    category: 'navigation',
  },
  {
    title: 'Insertar Enlace',
    keys: ['Ctrl', 'K'],
    description: 'Convierte el texto seleccionado en un enlace hipertexto.',
    category: 'navigation',
  },
  {
    title: 'Duplicar Selección',
    keys: ['Ctrl', 'D'],
    description: 'Duplica el texto o bloque seleccionado en la siguiente línea.',
    category: 'navigation',
  },

  // --- MARKDOWN RÁPIDO AL ESCRIBIR ---
  {
    title: 'Crear Título 1 al tipear',
    keys: ['#', 'Espacio'],
    description: 'Escribe "# " al comienzo de la línea para convertirla en Título grande.',
    category: 'markdown',
  },
  {
    title: 'Crear Título 2 al tipear',
    keys: ['##', 'Espacio'],
    description: 'Escribe "## " para convertir en subtítulo mediano.',
    category: 'markdown',
  },
  {
    title: 'Crear Título 3 al tipear',
    keys: ['###', 'Espacio'],
    description: 'Escribe "### " para subtítulo chico.',
    category: 'markdown',
  },
  {
    title: 'Crear Viñeta al tipear',
    keys: ['-', 'Espacio'],
    description: 'Escribe "- " o "* " al inicio para comenzar una lista.',
    category: 'markdown',
  },
  {
    title: 'Crear Lista numerada al tipear',
    keys: ['1.', 'Espacio'],
    description: 'Escribe "1. " para numeración automática.',
    category: 'markdown',
  },
  {
    title: 'Crear Casilla de verificación',
    keys: ['[]', 'Espacio'],
    description: 'Escribe "[] " para iniciar una lista de tareas pendientes.',
    category: 'markdown',
  },
  {
    title: 'Crear Desplegable al tipear',
    keys: ['>', 'Enter'],
    description: 'Escribe ">" y pulsa Enter para crear un acordeón colapsable.',
    category: 'markdown',
  },
  {
    title: 'Crear Cita al tipear',
    keys: ['""', 'Espacio'],
    description: 'Escribe comillas dobles y espacio para un bloque de cita.',
    category: 'markdown',
  },
  {
    title: 'Línea de corte',
    keys: ['---', 'Espacio'],
    description: 'Escribe tres guiones seguidos y pulsa espacio para trazar una línea divisoria.',
    category: 'markdown',
  },
];

interface ShortcutsGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShortcutsGuideModal: React.FC<ShortcutsGuideModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredShortcuts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SHORTCUTS_DATA.filter((item) => {
      const matchTab = activeTab === 'all' || item.category === activeTab;
      if (!matchTab) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q))
      );
    });
  }, [search, activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[94vw] max-h-[85vh] p-0 overflow-hidden flex flex-col border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Guía de Atajos y Comandos de Apuntes
                <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                  TABE
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Escribe a la velocidad del pensamiento combinando comandos rápidos y formato académico.
              </DialogDescription>
            </div>
          </div>

          {/* Search bar inside modal */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comando, atajo o función (ej: tabla, fórmula, resaltar, h1)..."
              className="pl-9 h-9 text-xs bg-background/80"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Category Tabs */}
        <div className="px-5 pt-3 border-b border-border/50 bg-background">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-8 bg-muted/60 p-0.5 w-full flex justify-start overflow-x-auto">
              <TabsTrigger value="all" className="text-xs h-7 px-3">
                Todos ({SHORTCUTS_DATA.length})
              </TabsTrigger>
              <TabsTrigger value="word" className="text-xs h-7 px-3">
                Formato Word
              </TabsTrigger>
              <TabsTrigger value="slash" className="text-xs h-7 px-3">
                Comandos / (Slash)
              </TabsTrigger>
              <TabsTrigger value="markdown" className="text-xs h-7 px-3">
                Markdown al tipear
              </TabsTrigger>
              <TabsTrigger value="navigation" className="text-xs h-7 px-3">
                Navegación & PDF
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto flex-1 divide-y divide-border/40 space-y-3">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No se encontraron atajos para "{search}". Prueba con otra palabra clave.
            </div>
          ) : (
            filteredShortcuts.map((item, index) => (
              <div
                key={index}
                className="pt-3 first:pt-0 flex items-start justify-between gap-4 group hover:bg-muted/30 p-2 rounded-lg transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {item.title}
                    </span>
                    {item.tag && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Key badges */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {item.keys.map((key, kIndex) => (
                    <React.Fragment key={kIndex}>
                      {key === 'o' ? (
                        <span className="text-[10px] text-muted-foreground px-0.5">o</span>
                      ) : (
                        <kbd className="px-2 py-1 text-[11px] font-mono font-semibold rounded-md bg-muted border border-border/80 shadow-xs text-foreground select-none">
                          {key}
                        </kbd>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer tip */}
        <footer className="p-3 px-5 border-t border-border/60 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Tip: También puedes escribir <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-background border border-border">/ayuda</kbd> en el editor para abrir esta guía.</span>
          </div>
          <span className="text-[11px] opacity-75">Presiona Esc para cerrar</span>
        </footer>
      </DialogContent>
    </Dialog>
  );
};
