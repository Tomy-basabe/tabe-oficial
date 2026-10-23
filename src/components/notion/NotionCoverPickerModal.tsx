import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NOTION_DEFAULT_COVERS, NotionCoverOption } from "@/data/notionCovers";
import { Trash2, Link2, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  Colors: "Colores",
  Gradients: "Degradados",
  Patterns: "Patrones",
  Minimalist: "Minimalistas",
  Academic: "Académico",
  Nature: "Naturaleza",
  Science: "Ciencia",
  Technology: "Tecnología",
  Arts: "Arte",
  Business: "Negocios",
  Travel: "Viajes",
  Wellness: "Bienestar",
  Dark: "Oscuras",
};

interface NotionCoverPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCoverUrl?: string | null;
  onSelectCover: (url: string | null) => void;
}

export function NotionCoverPickerModal({
  open,
  onOpenChange,
  currentCoverUrl,
  onSelectCover,
}: NotionCoverPickerModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("Colors");
  const [customUrl, setCustomUrl] = useState("");
  const categories = Array.from(
    new Set(NOTION_DEFAULT_COVERS.map((cover) => cover.category))
  );

  const filteredCovers = NOTION_DEFAULT_COVERS.filter(
    (c) => c.category === selectedCategory
  );

  const handleSelect = (url: string) => {
    onSelectCover(url);
    onOpenChange(false);
  };

  const handleRemove = () => {
    onSelectCover(null);
    onOpenChange(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelectCover(customUrl.trim());
    setCustomUrl("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Elegir portada de Notion
            </DialogTitle>
            {currentCoverUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Quitar portada
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Categories Tab */}
        <div className="flex items-center gap-1.5 pt-2 pb-1 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
                selectedCategory === cat
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Grid of covers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto py-2 pr-1 max-h-[340px]">
          {filteredCovers.map((cover) => {
            const isSelected = currentCoverUrl === cover.url;
            return (
              <button
                key={cover.id}
                type="button"
                onClick={() => handleSelect(cover.url)}
                className={cn(
                  "group relative aspect-video rounded-xl overflow-hidden border transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary/40",
                  isSelected
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border/50 hover:border-border hover:shadow-sm"
                )}
              >
                <img
                  src={cover.url}
                  alt={cover.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src =
                      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1600&h=900&q=85";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <span className="absolute bottom-2 left-2 text-[11px] font-medium text-white drop-shadow-sm truncate max-w-[85%]">
                  {cover.name}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom URL Input */}
        <form onSubmit={handleCustomSubmit} className="pt-3 border-t border-border/50 flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="O pega el enlace de una imagen (https://...)"
              className="pl-8 text-xs h-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={!customUrl.trim()} className="h-9 text-xs">
            Aplicar enlace
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
