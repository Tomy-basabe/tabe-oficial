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
  Lightbulb,
  Minus as DividerIcon,
  ChevronDown,
  Keyboard,
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
import { ColorPicker } from './ColorPicker';
import { cn } from '@/lib/utils';

interface WordToolbarProps {
  editor: Editor | null;
  fontFamily: 'sans' | 'serif' | 'mono';
  onFontFamilyChange: (font: 'sans' | 'serif' | 'mono') => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  onToggleFindReplace: () => void;
  onOpenShortcutsGuide?: () => void;
  onInsertSubpage?: () => void;
}

export const WordToolbar: React.FC<WordToolbarProps> = ({
  editor,
  isZenMode,
  onToggleZenMode,
  onToggleFindReplace,
  onOpenShortcutsGuide,
}) => {
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);

  if (!editor) return null;

  const getCurrentBlockLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Título 1';
    if (editor.isActive('heading', { level: 2 })) return 'Título 2';
    if (editor.isActive('heading', { level: 3 })) return 'Título 3';
    if (editor.isActive('blockquote')) return 'Cita';
    if (editor.isActive('codeBlock')) return 'Código';
    if (editor.isActive('bulletList')) return 'Lista con viñetas';
    if (editor.isActive('orderedList')) return 'Lista numerada';
    if (editor.isActive('taskList')) return 'Lista de tareas';
    return 'Texto';
  };

  const isTableActive = editor.isActive('table');

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-30 h-9 px-2.5 border-b border-border/40 bg-background/90 backdrop-blur-md select-none transition-all print:hidden flex items-center">
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar w-full">
          {/* UNDO / REDO */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Deshacer (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Rehacer (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-3.5 w-px bg-border/50 mx-1 shrink-0" />

          {/* NOTION BLOCK TYPE SELECTOR */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-7 px-2 text-xs font-medium text-foreground/85 hover:text-foreground hover:bg-muted/70 rounded-md inline-flex items-center gap-1.5 transition-colors border-0"
                  >
                    <span>{getCurrentBlockLabel()}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground/70" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Tipo de bloque / Título</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-48 p-1 shadow-lg border-border/60">
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive('paragraph') && 'bg-muted font-medium')}
              >
                <Type className="w-3.5 h-3.5 text-muted-foreground" />
                Texto normal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer font-semibold", editor.isActive('heading', { level: 1 }) && 'bg-muted text-primary')}
              >
                <Heading1 className="w-3.5 h-3.5 text-primary" />
                Título 1 (Grande)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer font-medium", editor.isActive('heading', { level: 2 }) && 'bg-muted text-primary')}
              >
                <Heading2 className="w-3.5 h-3.5 text-primary" />
                Título 2 (Mediano)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive('heading', { level: 3 }) && 'bg-muted text-primary')}
              >
                <Heading3 className="w-3.5 h-3.5 text-primary" />
                Título 3 (Pequeño)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive('bulletList') && 'bg-muted font-medium')}
              >
                <List className="w-3.5 h-3.5 text-muted-foreground" />
                Lista con viñetas
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive('orderedList') && 'bg-muted font-medium')}
              >
                <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
                Lista numerada
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive('taskList') && 'bg-muted font-medium')}
              >
                <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
                Lista de tareas
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer italic", editor.isActive('blockquote') && 'bg-muted font-medium')}
              >
                <Quote className="w-3.5 h-3.5 text-amber-500" />
                Cita destacada
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={cn("text-xs gap-2 py-1.5 cursor-pointer font-mono", editor.isActive('codeBlock') && 'bg-muted font-medium')}
              >
                <Code className="w-3.5 h-3.5 text-emerald-500" />
                Bloque de código
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-3.5 w-px bg-border/50 mx-1 shrink-0" />

          {/* TEXT FORMATTING MARKS */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md font-bold text-xs transition-colors",
                    editor.isActive('bold')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Negrita (Ctrl+B)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md italic text-xs transition-colors",
                    editor.isActive('italic')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Cursiva (Ctrl+I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors",
                    editor.isActive('underline')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Subrayado (Ctrl+U)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors",
                    editor.isActive('strike')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Tachado</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md font-mono text-xs transition-colors",
                    editor.isActive('code')
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Código en línea (Ctrl+E)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors hidden xl:inline-flex",
                    editor.isActive('subscript')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleSubscript().run()}
                >
                  <Subscript className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Subíndice (H₂O)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors hidden xl:inline-flex",
                    editor.isActive('superscript')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleSuperscript().run()}
                >
                  <Superscript className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Superíndice (x²)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-3.5 w-px bg-border/50 mx-1 shrink-0" />

          {/* NOTION COLOR PICKER */}
          <div className="flex items-center">
            <ColorPicker editor={editor} type="toolbar" />
          </div>

          <div className="h-3.5 w-px bg-border/50 mx-1 shrink-0" />

          {/* LISTS & INDENT */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors",
                    editor.isActive('bulletList')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Lista con viñetas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors",
                    editor.isActive('orderedList')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Lista numerada</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md text-xs transition-colors",
                    editor.isActive('taskList')
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Lista de tareas</TooltipContent>
            </Tooltip>

            {/* Indent / Outdent */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors hidden md:inline-flex"
                  onClick={() => editor.commands.outdent?.()}
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Reducir sangría (Shift+Tab)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors hidden md:inline-flex"
                  onClick={() => editor.commands.indent?.()}
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Aumentar sangría (Tab)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-3.5 w-px bg-border/50 mx-1 shrink-0" />

          {/* ALIGNMENT */}
          <div className="flex items-center">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                    >
                      {editor.isActive({ textAlign: 'center' }) ? (
                        <AlignCenter className="w-3.5 h-3.5 text-foreground" />
                      ) : editor.isActive({ textAlign: 'right' }) ? (
                        <AlignRight className="w-3.5 h-3.5 text-foreground" />
                      ) : editor.isActive({ textAlign: 'justify' }) ? (
                        <AlignJustify className="w-3.5 h-3.5 text-foreground" />
                      ) : (
                        <AlignLeft className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Alineación del texto</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-44 p-1 shadow-lg border-border/60">
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setTextAlign('left').run()}
                  className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive({ textAlign: 'left' }) && 'bg-muted font-medium')}
                >
                  <AlignLeft className="w-3.5 h-3.5 mr-1" />
                  Alinear a la izquierda
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setTextAlign('center').run()}
                  className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive({ textAlign: 'center' }) && 'bg-muted font-medium')}
                >
                  <AlignCenter className="w-3.5 h-3.5 mr-1" />
                  Centrar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setTextAlign('right').run()}
                  className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive({ textAlign: 'right' }) && 'bg-muted font-medium')}
                >
                  <AlignRight className="w-3.5 h-3.5 mr-1" />
                  Alinear a la derecha
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                  className={cn("text-xs gap-2 py-1.5 cursor-pointer", editor.isActive({ textAlign: 'justify' }) && 'bg-muted font-medium')}
                >
                  <AlignJustify className="w-3.5 h-3.5 mr-1" />
                  Justificar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="h-3.5 w-px bg-border/50 mx-1 shrink-0" />

          {/* QUICK INSERTS: TABLE, MATH, CALLOUT, DIVIDER */}
          <div className="flex items-center gap-0.5">
            {/* Tables menu */}
            <DropdownMenu open={tableDropdownOpen} onOpenChange={setTableDropdownOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                        isTableActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      )}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Herramientas de Tabla</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-48 p-1 shadow-lg border-border/60">
                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Tabla de datos</DropdownMenuLabel>
                {!isTableActive ? (
                  <DropdownMenuItem
                    onClick={() => {
                      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    }}
                    className="text-xs gap-2 py-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 text-primary" />
                    Insertar tabla 3x3
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()} className="text-xs gap-2 py-1.5 cursor-pointer">
                      <Plus className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      Añadir fila debajo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-xs gap-2 py-1.5 cursor-pointer">
                      <Plus className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      Añadir columna a la derecha
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-xs gap-2 py-1.5 cursor-pointer">
                      <Minus className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Eliminar fila actual
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-xs gap-2 py-1.5 cursor-pointer">
                      <Minus className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Eliminar columna actual
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 text-xs gap-2 py-1.5 cursor-pointer"
                      onClick={() => editor.chain().focus().deleteTable().run()}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Eliminar toda la tabla
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Math KaTeX */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors hidden sm:inline-flex"
                  onClick={() => {
                    const { from, to } = editor.state.selection;
                    const isRange = from !== to;
                    const selectedText = isRange ? editor.state.doc.textBetween(from, to, ' ').trim() : '';
                    editor.chain().focus().insertContent({
                      type: 'math',
                      attrs: { formula: selectedText || 'E = mc^2' },
                    }).run();
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('notion-trigger-math-edit'));
                    }, 50);
                  }}
                >
                  <Sigma className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Fórmula matemática (Ctrl+M)</TooltipContent>
            </Tooltip>

            {/* Callout box */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors hidden sm:inline-flex"
                  onClick={() => {
                    editor.chain().focus().insertContent({
                      type: 'callout',
                      attrs: { emoji: '💡', type: 'info' },
                    }).run();
                  }}
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Nota destacada / Callout</TooltipContent>
            </Tooltip>

            {/* Divider */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors hidden sm:inline-flex"
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                  <DividerIcon className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Línea divisoria</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex-1" />

          {/* RIGHT SIDE: FIND & REPLACE, SHORTCUTS, ZEN MODE */}
          <div className="flex items-center gap-0.5 shrink-0">
            {onOpenShortcutsGuide && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                    onClick={onOpenShortcutsGuide}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Atajos de teclado (Ctrl + /)</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                  onClick={onToggleFindReplace}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Buscar y reemplazar (Ctrl+F)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                    isZenMode
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  )}
                  onClick={onToggleZenMode}
                >
                  {isZenMode ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isZenMode ? 'Salir del Modo Zen' : 'Modo Zen (concentración)'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};
