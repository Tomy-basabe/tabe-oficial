import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Indent,
  Outdent,
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Highlighter,
  Palette,
  Search,
  Maximize,
  Minimize,
  Type,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Sigma,
  PieChart,
  Lightbulb,
  Minus as DividerIcon,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WordToolbarProps {
  editor: Editor | null;
  fontFamily: 'sans' | 'serif' | 'mono';
  onFontFamilyChange: (font: 'sans' | 'serif' | 'mono') => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onToggleFindReplace: () => void;
  onInsertSubpage?: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Sin resaltado', color: '' },
  { name: 'Amarillo apunte', color: 'rgba(254, 240, 138, 0.6)' },
  { name: 'Verde menta', color: 'rgba(187, 247, 208, 0.6)' },
  { name: 'Celeste pastel', color: 'rgba(186, 230, 253, 0.6)' },
  { name: 'Lavanda suave', color: 'rgba(233, 213, 255, 0.6)' },
  { name: 'Rosa coral', color: 'rgba(254, 205, 211, 0.6)' },
  { name: 'Naranja suave', color: 'rgba(254, 215, 170, 0.6)' },
];

const TEXT_COLORS = [
  { name: 'Por defecto', color: '' },
  { name: 'Negro / Blanco', color: 'currentColor' },
  { name: 'Azul marino', color: '#2563eb' },
  { name: 'Verde bosque', color: '#16a34a' },
  { name: 'Rojo carmín', color: '#dc2626' },
  { name: 'Púrpura', color: '#9333ea' },
  { name: 'Ámbar / Dorado', color: '#d97706' },
];

export const WordToolbar: React.FC<WordToolbarProps> = ({
  editor,
  fontFamily,
  onFontFamilyChange,
  isZenMode,
  onToggleZenMode,
  onToggleFindReplace,
  onInsertSubpage,
}) => {
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);

  if (!editor) return null;

  const getCurrentBlockLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Título 1';
    if (editor.isActive('heading', { level: 2 })) return 'Título 2';
    if (editor.isActive('heading', { level: 3 })) return 'Título 3';
    if (editor.isActive('blockquote')) return 'Cita';
    if (editor.isActive('codeBlock')) return 'Código';
    return 'Párrafo';
  };

  const isTableActive = editor.isActive('table');

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur-md px-2.5 py-1.5 shadow-xs select-none transition-all print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          {/* UNDO / REDO */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  <Undo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Deshacer (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Rehacer (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* BLOCK TYPE SELECTOR */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-medium gap-1.5 border border-border/50 bg-background/50 hover:bg-accent"
                  >
                    <span>{getCurrentBlockLabel()}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Estilo de texto / Título</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={editor.isActive('paragraph') ? 'bg-accent' : ''}
              >
                <Type className="w-4 h-4 mr-2 text-muted-foreground" />
                Texto normal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={editor.isActive('heading', { level: 1 }) ? 'bg-accent font-bold' : ''}
              >
                <Heading1 className="w-4 h-4 mr-2 text-primary" />
                Título Principal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor.isActive('heading', { level: 2 }) ? 'bg-accent font-semibold' : ''}
              >
                <Heading2 className="w-4 h-4 mr-2 text-primary" />
                Sección
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor.isActive('heading', { level: 3 }) ? 'bg-accent font-medium' : ''}
              >
                <Heading3 className="w-4 h-4 mr-2 text-primary" />
                Subsección
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={editor.isActive('blockquote') ? 'bg-accent italic' : ''}
              >
                <Quote className="w-4 h-4 mr-2 text-amber-500" />
                Cita destacada
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={editor.isActive('codeBlock') ? 'bg-accent font-mono' : ''}
              >
                <Code className="w-4 h-4 mr-2 text-emerald-500" />
                Bloque de código
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* FONT FAMILY SELECTOR */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs font-medium gap-1 border border-border/50 bg-background/50 hover:bg-accent"
                  >
                    <span className="truncate max-w-[75px] sm:max-w-[90px]">
                      {fontFamily === 'sans' ? 'Moderna' : fontFamily === 'serif' ? 'Académica' : 'Código'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Fuente tipográfica</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem
                onClick={() => onFontFamilyChange('sans')}
                className={fontFamily === 'sans' ? 'bg-accent font-bold' : ''}
              >
                Moderna (Inter)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onFontFamilyChange('serif')}
                className={`font-serif ${fontFamily === 'serif' ? 'bg-accent font-bold' : ''}`}
              >
                Académica (Serif)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onFontFamilyChange('mono')}
                className={`font-mono text-xs ${fontFamily === 'mono' ? 'bg-accent font-bold' : ''}`}
              >
                Técnica (Monospace)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* TEXT FORMATTING */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Negrita (Ctrl+B)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Cursiva (Ctrl+I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('underline') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <Underline className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Subrayado (Ctrl+U)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('strike') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Tachado</TooltipContent>
            </Tooltip>

            {/* Subscript & Superscript */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 hidden sm:inline-flex ${editor.isActive('subscript') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleSubscript().run()}
                >
                  <Subscript className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Subíndice (H₂O)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 hidden sm:inline-flex ${editor.isActive('superscript') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleSuperscript().run()}
                >
                  <Superscript className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Superíndice (x²)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* COLORS & HIGHLIGHT */}
          <div className="flex items-center gap-0.5">
            {/* Highlighter */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                    >
                      <Highlighter className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Resaltador de estudio</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="center" className="p-2 w-48">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Colores de resaltado
                </DropdownMenuLabel>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {HIGHLIGHT_COLORS.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (!h.color) {
                          editor.chain().focus().unsetHighlight().run();
                        } else {
                          editor.chain().focus().setHighlight({ color: h.color }).run();
                        }
                      }}
                      className="h-7 rounded-md border border-border/60 hover:scale-105 transition-transform flex items-center justify-center text-[10px]"
                      style={{ backgroundColor: h.color || 'transparent' }}
                      title={h.name}
                    >
                      {!h.color ? '✕' : ''}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Text Color */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Palette className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Color de letra</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="center" className="p-2 w-48">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Color de texto
                </DropdownMenuLabel>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {TEXT_COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (!c.color) {
                          editor.chain().focus().unsetColor().run();
                        } else {
                          editor.chain().focus().setColor(c.color).run();
                        }
                      }}
                      className="h-7 rounded-md border border-border/60 flex items-center justify-center hover:scale-105 transition-transform font-bold text-xs"
                      style={{ color: c.color || 'inherit' }}
                      title={c.name}
                    >
                      A
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* ALIGNMENT */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Alinear a la izquierda</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Centrar texto</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                >
                  <AlignRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Alinear a la derecha</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                >
                  <AlignJustify className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Justificar párrafo</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* LISTS & INDENT */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Lista con viñetas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Lista numerada</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${editor.isActive('taskList') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Lista de tareas pendientes</TooltipContent>
            </Tooltip>

            {/* Indent / Outdent */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden md:inline-flex text-muted-foreground hover:text-foreground"
                  onClick={() => editor.commands.outdent?.()}
                >
                  <Outdent className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reducir sangría (Shift+Tab)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden md:inline-flex text-muted-foreground hover:text-foreground"
                  onClick={() => editor.commands.indent?.()}
                >
                  <Indent className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Aumentar sangría (Tab)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* QUICK INSERTS: TABLE, MATH, CALLOUT, DIVIDER */}
          <div className="flex items-center gap-0.5">
            {/* Tables menu */}
            <DropdownMenu open={tableDropdownOpen} onOpenChange={setTableDropdownOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isTableActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <TableIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Herramientas de Tabla</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs font-medium">Tabla de datos</DropdownMenuLabel>
                {!isTableActive ? (
                  <DropdownMenuItem
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2 text-primary" />
                    Insertar tabla 3x3
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                      <Plus className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                      Añadir fila debajo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                      <Plus className="w-3.5 h-3.5 mr-2 text-blue-500" />
                      Añadir columna a la derecha
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                      <Minus className="w-3.5 h-3.5 mr-2 text-amber-500" />
                      Eliminar fila actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                      <Minus className="w-3.5 h-3.5 mr-2 text-amber-500" />
                      Eliminar columna actual
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10"
                      onClick={() => editor.chain().focus().deleteTable().run()}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Eliminar toda la tabla
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Math KaTeX */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  onClick={() => {
                    editor.chain().focus().insertContent({
                      type: 'math',
                      attrs: { latex: 'f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx' },
                    }).run();
                  }}
                >
                  <Sigma className="w-4 h-4 text-primary/80" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Fórmula matemática (KaTeX)</TooltipContent>
            </Tooltip>

            {/* Callout box */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  onClick={() => {
                    editor.chain().focus().insertContent({
                      type: 'callout',
                      attrs: { emoji: '💡', type: 'info' },
                    }).run();
                  }}
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Caja destacada / Nota de estudio</TooltipContent>
            </Tooltip>

            {/* Divider */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                  <DividerIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Línea separadora horizontal</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          {/* RIGHT SIDE: FIND & REPLACE & ZEN MODE */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  onClick={onToggleFindReplace}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Buscar y reemplazar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Buscar y reemplazar en el apunte (Ctrl+F)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${isZenMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={onToggleZenMode}
                >
                  {isZenMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isZenMode ? 'Salir del Modo Zen' : 'Modo Zen (concentración sin distracciones)'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};
