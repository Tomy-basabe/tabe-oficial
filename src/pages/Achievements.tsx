import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy,
  
  Search,
  X,
  LayoutGrid,
  List,
  Award,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Lock,
  ChevronDown,
  Check,
  SlidersHorizontal,
  ArrowDownAZ,
  TrendingUp, Zap } from "lucide-react";
import { useAchievements, Achievement } from "@/hooks/useAchievements";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AchievementCard,
} from "@/components/achievements/AchievementCard";
import {
  AchievementDetailModal,
} from "@/components/achievements/AchievementDetailModal";
import {
  AchievementRankModal,
} from "@/components/achievements/AchievementRankModal";
import {
  AchievementShareModal,
} from "@/components/achievements/AchievementShareModal";
import {
  calculateUserRank,
  categoryThemes,
} from "@/components/achievements/achievementUtils";

type StatusFilter = "all" | "unlocked" | "locked";
type SortOption = "default" | "xp-desc" | "xp-asc" | "name" | "recent";

const SORT_LABELS: Record<SortOption, { label: string; icon: any }> = {
  default: { label: "Orden predeterminado", icon: SlidersHorizontal },
  "xp-desc": { label: "Mayor XP (+XP)", icon: Zap },
  "xp-asc": { label: "Menor XP", icon: TrendingUp },
  name: { label: "Alfabético (A - Z)", icon: ArrowDownAZ },
  recent: { label: "Desbloqueados primero", icon: CheckCircle2 },
};

export default function Achievements() {
  const {
    achievements,
    loading,
    stats,
    isUnlocked,
    getUnlockDate,
    checkAndUnlockAchievements,
  } = useAchievements();

  // Estados de interfaz y filtrado
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Estados de Modales
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingAchievement, setSharingAchievement] = useState<{
    achievement: Achievement;
    unlockDate: string | null;
  } | null>(null);

  // Comprobar logros silenciosamente al cargar para mantener el estado actualizado en segundo plano
  useEffect(() => {
    const checkSilently = async () => {
      try {
        await checkAndUnlockAchievements();
      } catch (err) {
        console.warn("Silent achievement check:", err);
      }
    };
    checkSilently();
  }, []);

  // Abrir detalle
  const handleSelectAchievement = useCallback((achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setIsDetailOpen(true);
  }, []);

  // Abrir compartir
  const handleOpenShare = useCallback((achievement: Achievement, unlockDate: string | null) => {
    setSharingAchievement({ achievement, unlockDate });
    setIsShareModalOpen(true);
  }, []);

  // Rango actual del usuario
  const userRank = useMemo(() => calculateUserRank(stats.totalXP), [stats.totalXP]);

  // Filtrado y ordenación de logros
  const filteredAchievements = useMemo(() => {
    return achievements
      .filter((a) => {
        // Filtro por categoría
        if (selectedCategory && a.categoria !== selectedCategory) {
          return false;
        }

        // Filtro por estado
        const unlocked = isUnlocked(a.id);
        if (statusFilter === "unlocked" && !unlocked) return false;
        if (statusFilter === "locked" && unlocked) return false;

        // Filtro por búsqueda
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = a.nombre.toLowerCase().includes(q);
          const matchDesc = a.descripcion.toLowerCase().includes(q);
          const matchCat = a.categoria.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "xp-desc") {
          return b.xp_reward - a.xp_reward;
        }
        if (sortOption === "xp-asc") {
          return a.xp_reward - b.xp_reward;
        }
        if (sortOption === "name") {
          return a.nombre.localeCompare(b.nombre);
        }
        if (sortOption === "recent") {
          const unlockedA = isUnlocked(a.id);
          const unlockedB = isUnlocked(b.id);
          if (unlockedA && !unlockedB) return -1;
          if (!unlockedA && unlockedB) return 1;
        }
        return 0;
      });
  }, [achievements, selectedCategory, statusFilter, searchQuery, sortOption, isUnlocked]);

  // Contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { total: number; unlocked: number }> = {};
    Object.keys(categoryThemes).forEach((cat) => {
      const items = achievements.filter((a) => a.categoria === cat);
      counts[cat] = {
        total: items.length,
        unlocked: items.filter((a) => isUnlocked(a.id)).length,
      };
    });
    return counts;
  }, [achievements, isUnlocked]);

  const completionPercentage =
    stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  if (loading && achievements.length === 0) {
    return (
      <LoadingScreen
        message="Cargando tus logros..."
        submessage="Sincronizando insignias y experiencia acumulada..."
      />
    );
  }

  const ActiveSortIcon = SORT_LABELS[sortOption].icon;

  return (
    <div className="tabe-page p-4 lg:p-7 max-w-[1500px] mx-auto space-y-6">
      {/* Header Bento Style Notion/ChatGPT */}
      <div className="neo-bento-card p-6 lg:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => setIsRankModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 transition-colors cursor-pointer"
            >
              <span>Nivel {userRank.rank.level} · {userRank.rank.title}</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>

          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Logros e Insignias
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
            Alcanza hitos de estudio, sube de nivel y desbloquea recompensas en tu trayecto formativo.
          </p>
        </div>

        {/* Acciones principales del Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botón Ver Rangos */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsRankModalOpen(true)}
            className="text-xs font-medium gap-1.5 h-9"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Ver mi rango</span>
          </Button>

          {/* XP Badge Pill */}
          <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-1.5 shadow-2xs h-9">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-semibold">{stats.totalXP}</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">XP</span>
          </div>
        </div>
      </div>

      {/* Bento Grid: Progreso Global y Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card Progreso General (8 columnas en desktop) */}
        <div className="lg:col-span-8 neo-bento-card p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Progreso Global
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Has completado {stats.unlocked} de {stats.total} logros disponibles
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {completionPercentage}%
                </span>
                <span className="text-xs font-medium text-zinc-400">completado</span>
              </div>
            </div>

            {/* Barra de progreso minimalista */}
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
              <div
                className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-700"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Mini recomendación inline */}
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Nivel actual: <strong>{userRank.rank.title}</strong> · {userRank.nextRank ? `Faltan ${userRank.levelTargetXP - userRank.currentLevelXP} XP para Nivel ${userRank.nextRank.level}` : "Rango Máximo"}
              </span>
            </div>

            <button
              onClick={() => setIsRankModalOpen(true)}
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Ver tabla de rangos →
            </button>
          </div>
        </div>

        {/* Resumen rápido de Insignias (4 columnas en desktop) */}
        <div className="lg:col-span-4 neo-bento-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Desbloqueados
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Distribución de tus logros en el ecosistema Tabe
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Logros conseguidos
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.unlocked}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  Por desbloquear
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats.total - stats.unlocked}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Experiencia total ganada
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  +{stats.totalXP} XP
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              onClick={() => setIsRankModalOpen(true)}
              className="w-full text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between py-1 transition-colors"
            >
              <span>Explorar escala de títulos</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas Bento de Categorías (Filtros interactivos estilo Notion) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Object.entries(categoryThemes).map(([key, theme]) => {
          const counts = categoryCounts[key] || { total: 0, unlocked: 0 };
          const isSelected = selectedCategory === key;
          const pct = counts.total > 0 ? Math.round((counts.unlocked / counts.total) * 100) : 0;

          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(isSelected ? null : key)}
              className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none relative overflow-hidden group ${
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm"
                  : "bg-white dark:bg-[#212121] border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {theme.label}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {pct}%
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold tracking-tight ${
                    isSelected ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {counts.unlocked}
                </span>
                <span
                  className={`text-xs ${
                    isSelected ? "text-white/70 dark:text-zinc-900/70" : "text-zinc-400"
                  }`}
                >
                  / {counts.total}
                </span>
              </div>

              {/* Barra de progreso de la categoría */}
              <div
                className={`h-1.5 rounded-full overflow-hidden mt-3 ${
                  isSelected ? "bg-white/20 dark:bg-zinc-900/20" : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isSelected
                      ? "bg-white dark:bg-zinc-900"
                      : theme.accentClass
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de Herramientas y Filtros (Notion / ChatGPT Style Toolbar) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Izquierda: Buscador */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar logro por nombre o descripción..."
            className="w-full rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] pl-9 pr-8 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Derecha: Desplegables refinados de Categoría y Ordenación + Segmented Control + Vista */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Desplegable Notion Style: Categorías */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-2xs transition-colors focus:outline-none cursor-pointer">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {selectedCategory
                  ? categoryThemes[selectedCategory]?.label
                  : "Todas las áreas"}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl p-1"
            >
              <DropdownMenuLabel className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Filtrar por Área
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-400" />
                  <span>Todas las áreas</span>
                </div>
                {!selectedCategory && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
              {Object.entries(categoryThemes).map(([catKey, theme]) => {
                const count = categoryCounts[catKey];
                const isActive = selectedCategory === catKey;
                return (
                  <DropdownMenuItem
                    key={catKey}
                    onClick={() => setSelectedCategory(isActive ? null : catKey)}
                    className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                      <span>{theme.label}</span>
                      <span className="text-[10px] text-zinc-400">
                        ({count?.unlocked || 0}/{count?.total || 0})
                      </span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desplegable Notion Style: Ordenación */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 shadow-2xs transition-colors focus:outline-none cursor-pointer">
              <ActiveSortIcon className="w-3.5 h-3.5 text-zinc-400" />
              <span>{SORT_LABELS[sortOption].label}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 ml-0.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-xl p-1"
            >
              <DropdownMenuLabel className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                Ordenar por
              </DropdownMenuLabel>
              {Object.entries(SORT_LABELS).map(([optKey, config]) => {
                const OptionIcon = config.icon;
                const isSelected = sortOption === optKey;
                return (
                  <DropdownMenuItem
                    key={optKey}
                    onClick={() => setSortOption(optKey as SortOption)}
                    className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <OptionIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{config.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Segmented Control Estado */}
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg flex items-center border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium h-9">
            {([
              { id: "all", label: `Todos (${achievements.length})` },
              { id: "unlocked", label: `Desbloqueados (${stats.unlocked})` },
              { id: "locked", label: `Bloqueados (${stats.total - stats.unlocked})` },
            ] as const).map((st) => {
              const isSelected = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`relative px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="achievements-status-pill"
                      transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                      className="absolute inset-0 rounded-md bg-white dark:bg-[#212121] shadow-2xs"
                    />
                  )}
                  <span className="relative z-10">{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toggle de Vista: Grid vs List */}
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg flex items-center border border-zinc-200/60 dark:border-zinc-700/60 h-9">
            {([
              { id: "grid", icon: LayoutGrid, title: "Vista cuadrícula" },
              { id: "list", icon: List, title: "Vista lista" },
            ] as const).map((vm) => {
              const VIcon = vm.icon;
              const isSelected = viewMode === vm.id;
              return (
                <button
                  key={vm.id}
                  onClick={() => setViewMode(vm.id)}
                  title={vm.title}
                  className={`relative p-1.5 rounded-md transition-colors cursor-pointer ${
                    isSelected
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="achievements-view-pill"
                      transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                      className="absolute inset-0 rounded-md bg-white dark:bg-[#212121] shadow-2xs"
                    />
                  )}
                  <VIcon className="relative z-10 w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Indicador de Filtros Activos si hay categoría o búsqueda seleccionada */}
      {(selectedCategory || searchQuery || statusFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-zinc-400 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtros activos:
          </span>

          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              Área: {categoryThemes[selectedCategory]?.label}
              <button
                onClick={() => setSelectedCategory(null)}
                className="hover:text-red-500 ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              Búsqueda: "{searchQuery}"
              <button
                onClick={() => setSearchQuery("")}
                className="hover:text-red-500 ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {statusFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              Estado: {statusFilter === "unlocked" ? "Desbloqueados" : "Bloqueados"}
              <button
                onClick={() => setStatusFilter("all")}
                className="hover:text-red-500 ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium ml-1 cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Lista / Grilla de Logros */}
      {filteredAchievements.length === 0 ? (
        <div className="neo-bento-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No se encontraron logros
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Intenta cambiar los términos de búsqueda o limpiar los filtros seleccionados para ver más insignias.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory(null);
              setStatusFilter("all");
            }}
            className="text-xs font-medium"
          >
            Restablecer filtros
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredAchievements.map((achievement) => {
              const unlocked = isUnlocked(achievement.id);
              const unlockDate = getUnlockDate(achievement.id);

              return (
                <motion.div
                  layout
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(5px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, y: -8, filter: "blur(6px)", transition: { duration: 0.2 } }}
                  transition={{
                    layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.75 },
                    opacity: { duration: 0.22 },
                  }}
                >
                  <AchievementCard
                    achievement={achievement}
                    unlocked={unlocked}
                    unlockDate={unlockDate}
                    onSelect={handleSelectAchievement}
                    onShare={handleOpenShare}
                    viewMode="grid"
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredAchievements.map((achievement) => {
              const unlocked = isUnlocked(achievement.id);
              const unlockDate = getUnlockDate(achievement.id);

              return (
                <motion.div
                  layout
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.92, y: 12, filter: "blur(5px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.9, y: -8, filter: "blur(6px)", transition: { duration: 0.2 } }}
                  transition={{
                    layout: { type: "spring", stiffness: 380, damping: 32, mass: 0.75 },
                    opacity: { duration: 0.22 },
                  }}
                >
                  <AchievementCard
                    achievement={achievement}
                    unlocked={unlocked}
                    unlockDate={unlockDate}
                    onSelect={handleSelectAchievement}
                    onShare={handleOpenShare}
                    viewMode="list"
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modales Interactivos del Apartado */}
      <AchievementDetailModal
        achievement={selectedAchievement}
        unlocked={selectedAchievement ? isUnlocked(selectedAchievement.id) : false}
        unlockDate={selectedAchievement ? getUnlockDate(selectedAchievement.id) : null}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onOpenShare={handleOpenShare}
      />

      <AchievementRankModal
        open={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
        achievements={achievements}
        isUnlocked={isUnlocked}
        totalXP={stats.totalXP}
      />

      <AchievementShareModal
        achievement={sharingAchievement?.achievement || null}
        unlockDate={sharingAchievement?.unlockDate || null}
        open={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}
