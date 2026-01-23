import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  NOTION_TEXT_COLORS,
  NOTION_BACKGROUND_COLORS,
  NOTION_BACKGROUND_COLORS_DARK,
} from "./extensions/ColorExtension";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Type, PaintBucket } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ColorPickerProps {
  editor: any;
  type?: "toolbar" | "bubble";
}

export function ColorPicker({ editor, type = "toolbar" }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  const currentTextColor = editor?.getAttributes("textStyle")?.color || null;
  const currentBgColor =
    editor?.getAttributes("textStyle")?.backgroundColor || null;

  // Detect dark mode
  const isDarkMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const backgroundColors = isDarkMode
    ? NOTION_BACKGROUND_COLORS_DARK
    : NOTION_BACKGROUND_COLORS;

  const setTextColor = useCallback(
    (color: string | null) => {
      if (color) {
        editor?.chain().focus().setColor(color).run();
      } else {
        editor?.chain().focus().unsetColor().run();
      }
    },
    [editor]
  );

  const setBackgroundColor = useCallback(
    (color: string | null) => {
      if (color) {
        editor?.chain().focus().setBackgroundColor(color).run();
      } else {
        editor?.chain().focus().unsetBackgroundColor().run();
      }
    },
    [editor]
  );

  const ColorButton = ({
    color,
    name,
    isActive,
    onClick,
    showLetter = false,
  }: {
    color: string | null;
    name: string;
    isActive: boolean;
    onClick: () => void;
    showLetter?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center transition-all border",
        isActive
          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
          : "hover:scale-110",
        color === null
          ? "border-border bg-transparent"
          : "border-transparent"
      )}
      style={{
        backgroundColor: color || undefined,
      }}
      title={name}
    >
      {color === null && (
        <span className="text-xs text-muted-foreground">∅</span>
      )}
      {showLetter && color && (
        <span
          className="font-bold text-sm"
          style={{ color: color }}
        >
          A
        </span>
      )}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-1.5 rounded transition-colors flex items-center gap-1",
            open || currentTextColor || currentBgColor
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
          )}
          title="Colores (A)"
        >
          <Palette className="w-4 h-4" />
          {type === "toolbar" && (
            <div className="w-3 h-3 rounded-sm flex overflow-hidden">
              <div
                className="w-1/2 h-full"
                style={{
                  backgroundColor: currentTextColor || "hsl(var(--foreground))",
                }}
              />
              <div
                className="w-1/2 h-full"
                style={{
                  backgroundColor: currentBgColor || "transparent",
                }}
              />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-3">
            <TabsTrigger value="text" className="gap-1.5 text-xs">
              <Type className="w-3 h-3" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="background" className="gap-1.5 text-xs">
              <PaintBucket className="w-3 h-3" />
              Fondo
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-0">
            <div className="grid grid-cols-5 gap-1.5">
              {NOTION_TEXT_COLORS.map((item) => (
                <ColorButton
                  key={item.class}
                  color={item.color}
                  name={item.name}
                  isActive={currentTextColor === item.color}
                  onClick={() => {
                    setTextColor(item.color);
                    setOpen(false);
                  }}
                  showLetter={true}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="background" className="mt-0">
            <div className="grid grid-cols-5 gap-1.5">
              {backgroundColors.map((item) => (
                <ColorButton
                  key={item.class}
                  color={item.color}
                  name={item.name}
                  isActive={currentBgColor === item.color}
                  onClick={() => {
                    setBackgroundColor(item.color);
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// Standalone color menu component for slash commands
interface ColorMenuProps {
  items: Array<{ name: string; color: string | null; type: "text" | "bg" }>;
  command: (item: { name: string; color: string | null; type: "text" | "bg" }) => void;
  selectedIndex: number;
}

export function ColorMenu({ items, command, selectedIndex }: ColorMenuProps) {
  return (
    <div className="slash-menu bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto min-w-[240px]">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50">
        Colores de Texto
      </div>
      {NOTION_TEXT_COLORS.map((item, index) => (
        <button
          key={`text-${item.class}`}
          onClick={() => command({ ...item, type: "text" })}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
            selectedIndex === index
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary"
          )}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center border",
              item.color ? "border-transparent" : "border-border"
            )}
            style={{ backgroundColor: item.color || undefined }}
          >
            {item.color ? (
              <span className="font-bold text-sm text-white drop-shadow">A</span>
            ) : (
              <span className="text-xs text-muted-foreground">∅</span>
            )}
          </div>
          <span className="text-sm" style={{ color: item.color || undefined }}>
            {item.name}
          </span>
        </button>
      ))}
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-secondary/50 border-t border-border">
        Colores de Fondo
      </div>
      {NOTION_BACKGROUND_COLORS.map((item, index) => (
        <button
          key={`bg-${item.class}`}
          onClick={() => command({ ...item, type: "bg" })}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
            selectedIndex === NOTION_TEXT_COLORS.length + index
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary"
          )}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-md border",
              item.color ? "border-transparent" : "border-border"
            )}
            style={{ backgroundColor: item.color || undefined }}
          />
          <span
            className="text-sm px-1.5 py-0.5 rounded"
            style={{ backgroundColor: item.color || undefined }}
          >
            {item.name}
          </span>
        </button>
      ))}
    </div>
  );
}
