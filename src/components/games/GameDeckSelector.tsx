import { useState, useMemo } from "react";
import { ArrowLeft, BookOpen, Check, Search, Plus, GraduationCap, Play, Info, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface StudyDeckItem {
  id: string;
  nombre: string;
  total_questions?: number;
}

interface GameDeckSelectorProps {
  gameTitle: string;
  gameSubtitle?: string;
  gameIcon: React.ComponentType<{ className?: string }>;
  gameRules?: string;
  decks: StudyDeckItem[];
  selectedDeck: StudyDeckItem | null;
  onSelectDeck: (deck: StudyDeckItem) => void;
  onStartSearch: () => void;
  onBack?: () => void;
  userCarrera?: string | null;
  onOpenCareerModal?: () => void;
  actionButtonLabel?: string;
}

export function GameDeckSelector({
  gameTitle,
  gameSubtitle = "Las preguntas de la partida se obtendrán de tu mazo de estudio.",
  gameIcon: GameIcon,
  gameRules,
  decks,
  selectedDeck,
  onSelectDeck,
  onStartSearch,
  onBack,
  userCarrera,
  onOpenCareerModal,
  actionButtonLabel = "Buscar rival ahora",
}: GameDeckSelectorProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/juegos");
    }
  };

  // Limpiar posibles emojis remanentes de nombres de mazo por defecto
  const cleanDeckName = (name: string) => {
    return name.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, "").trim();
  };

  const filteredDecks = useMemo(() => {
    return decks.filter((d) =>
      cleanDeckName(d.nombre).toLowerCase().includes(search.toLowerCase())
    );
  }, [decks, search]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col justify-center items-center text-foreground bg-background">
      <div className="w-full max-w-xl space-y-5">
        {/* Top bar with back and career */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Juegos</span>
          </Button>

          {userCarrera && (
            <button
              onClick={onOpenCareerModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/70 bg-muted/30 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Cambiar carrera"
            >
              <GraduationCap className="w-3.5 h-3.5 text-primary" />
              <span className="max-w-[140px] truncate">{userCarrera}</span>
            </button>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border/80 shadow-md rounded-2xl p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <GameIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
                  {gameTitle}
                </h1>
                <Badge variant="outline" className="text-[10px] font-normal py-0 h-5">
                  Iniciar partida
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {gameSubtitle}
              </p>
            </div>
          </div>

          {/* Quick rules note if present */}
          {gameRules && (
            <div className="p-3 bg-muted/40 border border-border/60 rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="leading-relaxed">{gameRules}</p>
            </div>
          )}

          {/* Deck Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Selecciona tu mazo de estudio</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                {decks.length} {decks.length === 1 ? "disponible" : "disponibles"}
              </span>
            </div>

            {/* Search if there are more than 3 decks */}
            {decks.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar mazo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30 border-border/70"
                />
              </div>
            )}

            {/* Decks List */}
            <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
              {filteredDecks.length === 0 ? (
                <div className="text-center py-8 bg-muted/20 border border-dashed border-border/80 rounded-xl space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-medium text-foreground">No tienes mazos creados aún</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Crea un mazo de preguntas académicas para poder jugar con tus materias.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/cuestionarios")}
                    className="text-xs h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Crear cuestionario
                  </Button>
                </div>
              ) : (
                filteredDecks.map((deck) => {
                  const isSelected = selectedDeck?.id === deck.id;
                  const name = cleanDeckName(deck.nombre);
                  const questionsCount = deck.total_questions ?? 15;

                  return (
                    <button
                      key={deck.id}
                      type="button"
                      onClick={() => onSelectDeck(deck)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-center justify-between group",
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground shadow-sm"
                          : "border-border/60 bg-card/60 hover:bg-muted/50 hover:border-border text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:text-foreground"
                          )}
                        >
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">
                            {name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {questionsCount} preguntas académicas
                          </p>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 bg-background"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              className="w-full h-11 text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
              disabled={!selectedDeck}
              onClick={onStartSearch}
            >
              <Swords className="w-4 h-4" />
              <span>{actionButtonLabel}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
