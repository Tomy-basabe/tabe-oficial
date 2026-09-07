import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Brain, Target, Sparkles, Shield, Compass, Star } from "lucide-react";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { useComic } from "@/components/comic/ComicEffectsProvider";
import { ComicBadge } from "@/components/comic/ComicBadge";

interface SuperpowerCard {
  id: string;
  name: string;
  subtitle: string;
  rarity: "LEGENDARIO" | "ÉPICO" | "MÍTICO" | "DIVINO";
  rarityColor: "yellow" | "pink" | "green" | "orange";
  themeColor: string;
  icon: typeof Zap;
  stats: Array<{ label: string; value: number }>;
  desc: string;
}

const SUPERPOWERS: SuperpowerCard[] = [
  {
    id: "laser-focus",
    name: "Enfoque Láser",
    subtitle: "Pomodoro + Mi Bosque Virtual",
    rarity: "LEGENDARIO",
    rarityColor: "yellow",
    themeColor: "#1475e5",
    icon: Target,
    stats: [
      { label: "Concentración Pura", value: 99 },
      { label: "Anti-Distracción", value: 100 },
      { label: "Productividad", value: 95 },
    ],
    desc: "Bloqueá las redes sociales y mirá cómo tus árboles crecen mientras estudiás tus materias.",
  },
  {
    id: "photo-memory",
    name: "Memoria Fotográfica",
    subtitle: "Flashcards con Repetición Espaciada",
    rarity: "ÉPICO",
    rarityColor: "pink",
    themeColor: "#FF2E93",
    icon: Brain,
    stats: [
      { label: "Retención a Largo Plazo", value: 98 },
      { label: "Velocidad de Repaso", value: 95 },
      { label: "Comprensión Activa", value: 94 },
    ],
    desc: "Memorizá fórmulas, leyes y definiciones en la mitad del tiempo sin memorizar de memoria.",
  },
  {
    id: "exam-radar",
    name: "Radar de Finales",
    subtitle: "Mapa de Correlatividades y Carrera",
    rarity: "MÍTICO",
    rarityColor: "green",
    themeColor: "#00FF66",
    icon: Compass,
    stats: [
      { label: "Planificación Estratégica", value: 100 },
      { label: "Previsión de Fechas", value: 97 },
      { label: "Cuatrimestres Salvados", value: 100 },
    ],
    desc: "Visualizá qué materias te traban la carrera y armá tu cuatrimestre perfecto sin sorpresas.",
  },
  {
    id: "ai-oracle",
    name: "Oráculo de Bolsillo",
    subtitle: "IA Especializada Universitaria",
    rarity: "DIVINO",
    rarityColor: "orange",
    themeColor: "#FF6B00",
    icon: Sparkles,
    stats: [
      { label: "Explicaciones Claras", value: 99 },
      { label: "Generación de Quizzes", value: 96 },
      { label: "Disponibilidad 24/7", value: 100 },
    ],
    desc: "Resolvé dudas a las 2 AM con un asistente entrenado en pedagogía y materias universitarias.",
  },
];

export function ComicSuperpowersSection() {
  const { triggerBurst } = useComic();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const handleCardClick = (card: SuperpowerCard, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    triggerBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, `${card.name.toUpperCase()}!`);
    ComicAudio.playPowerUp();
    setActiveCardId(card.id);
  };

  return (
    <section className="py-24 px-4 md:px-6 relative overflow-hidden bg-secondary/30">
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ComicBadge variant="orange" rotate="left" size="md">
              <Shield className="w-3.5 h-3.5 fill-white" /> DECK DE HABILIDADES
            </ComicBadge>
            <ComicBadge variant="yellow" rotate="right" size="md">
              <Star className="w-3.5 h-3.5 fill-black" /> EDICIÓN CÓMIC
            </ComicBadge>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground">
            Elegí tus <span className="text-[#FF2E93] underline decoration-wavy decoration-[#FFE600]">Superpoderes</span> Universitarios
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-bold">
            Cada módulo de TABE funciona como un superpoder diseñado para que apruebes con menos esfuerzo y más diversión.
          </p>
        </div>

        {/* 4 Superpower Trading Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUPERPOWERS.map((card) => {
            const Icon = card.icon;
            const isSelected = activeCardId === card.id;

            return (
              <motion.div
                key={card.id}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => handleCardClick(card, e)}
                className="group relative bg-card rounded-2xl border-[3px] border-foreground p-5 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 overflow-hidden"
                style={{
                  boxShadow: isSelected
                    ? `8px 8px 0 0 ${card.themeColor}`
                    : `5px 5px 0 0 ${card.themeColor}`,
                }}
              >
                {/* Comic Card Top Bar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <ComicBadge variant={card.rarityColor} rotate="none" size="sm">
                      {card.rarity}
                    </ComicBadge>
                    <span className="text-[10px] font-black text-muted-foreground uppercase">
                      CARD #0{SUPERPOWERS.indexOf(card) + 1}
                    </span>
                  </div>

                  {/* Card Visual Icon Container with Inked Frame */}
                  <div
                    className="w-full h-32 rounded-xl border-2 border-foreground flex items-center justify-center relative overflow-hidden shadow-[2px_2px_0_0_#000] transition-transform duration-200 group-hover:scale-[1.03]"
                    style={{ backgroundColor: `${card.themeColor}20` }}
                  >
                    {/* Halftone Pattern in Card Art */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle, #000 1.5px, transparent 1.5px)`,
                        backgroundSize: "8px 8px",
                      }}
                    />
                    <div
                      className="w-16 h-16 rounded-2xl border-2 border-foreground flex items-center justify-center shadow-[3px_3px_0_0_#000]"
                      style={{ backgroundColor: card.themeColor }}
                    >
                      <Icon className="w-8 h-8 text-black" />
                    </div>
                  </div>

                  {/* Card Title & Description */}
                  <div>
                    <h3 className="font-black text-xl text-foreground uppercase tracking-tight">
                      {card.name}
                    </h3>
                    <p className="text-xs font-black text-primary mt-0.5">
                      {card.subtitle}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground mt-2 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  {/* Stats Bars */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    {card.stats.map((stat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black text-foreground uppercase">
                          <span>{stat.label}</span>
                          <span style={{ color: card.themeColor }}>{stat.value}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full border border-foreground overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: card.themeColor }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${stat.value}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Button */}
                <div className="pt-5">
                  <div
                    className="w-full text-center py-2 rounded-xl font-black text-xs uppercase border-2 border-foreground shadow-[2px_2px_0_0_#000] transition-colors"
                    style={{
                      backgroundColor: isSelected ? card.themeColor : "hsl(var(--secondary))",
                      color: isSelected ? "#000" : "inherit",
                    }}
                  >
                    {isSelected ? "✦ ACTIVADO EN TABE" : "👆 PROBAR HABILIDAD"}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
