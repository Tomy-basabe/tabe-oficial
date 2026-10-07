import { 
  LayoutDashboard, 
  GraduationCap, 
  Calendar, 
  Timer, 
  BarChart3, 
  Bot, 
  Settings, 
  Zap, 
  Layers, 
  ClipboardList, 
  Library, 
  Trophy, 
  Shield, 
  Users, 
  Store, 
  TreeDeciduous, 
  Repeat2, 
  Clock,
  Folder,
  Brain, Target, Lightbulb, Rocket, Book, BookOpen, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Bell, Heart, Star, Flame,
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, CheckCircle2, CheckSquare,
  Search, Compass
} from "lucide-react";
import { ApuntesIcon, NotionIcon } from "@/components/icons/NotionIcon";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { TabetalkIcon } from "@/components/icons/TabetalkIcon";
import { ArcadeIcon } from "@/components/icons/ArcadeIcon";

export interface NavItem {
  icon: any;
  label: string;
  path: string;
  tourClass?: string;
  isCategory?: boolean;
  items?: NavItem[];
}

export interface CustomSidebarItem {
  id: string;
  label: string;
  type: "item" | "category";
  path?: string;
  iconName?: string;
  items?: CustomSidebarItem[];
}

export const ICON_MAP: Record<string, any> = {
  GraduationCap, LayoutDashboard, Clock, FileText: ClipboardList, Layers, ClipboardList, Store, Library, Calendar,
  Trophy, Brain, Target, Lightbulb, Rocket, Book, BookOpen, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Users, Bell, Search, Settings, Heart, Star, Flame, Zap,
  ApuntesIcon, NotionIcon: ApuntesIcon, TabeAIIcon, TabetalkIcon, Tabetalk: TabetalkIcon,
  Shield, Compass, Bot: TabeAIIcon, Repeat2, Timer, BarChart3, TreeDeciduous,
  Gamepad2, Arcade: ArcadeIcon, ArcadeIcon
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const DEFAULT_ICON_MAPPING: Record<string, string> = {
  "/dashboard": "LayoutDashboard",
  "/carrera": "GraduationCap",
  "/consultas": "Clock",
  "/apuntes": "ApuntesIcon",
  "/flashcards": "Layers",
  "/cuestionarios": "ClipboardList",
  "/marketplace": "Store",
  "/biblioteca": "Library",
  "/calendario": "Calendar",
  "/rutinas": "Repeat2",
  "/pomodoro": "Timer",
  "/tareas": "CheckSquare",
  "/metricas": "BarChart3",
  "/bosque": "TreeDeciduous",
  "/logros": "Trophy",
  "/amigos": "Users",
  "/TABEAI": "TabeAIIcon",
  "/admin": "Shield",
  "/configuracion": "Settings",
  "/examenes": "GraduationCap",
  "/juegos": "Arcade",
  "/tabegochi": "Sparkles",
  "/mapa": "Compass",
  "/tabetalk": "TabetalkIcon",
  "/discord": "TabetalkIcon"
};

export const DEFAULT_CATEGORIZED_SIDEBAR: CustomSidebarItem[] = [
  {
    id: "item-/dashboard",
    path: "/dashboard",
    label: "Dashboard",
    type: "item",
    iconName: "LayoutDashboard"
  },
  {
    id: "item-/TABEAI",
    path: "/TABEAI",
    label: "TABE IA",
    type: "item",
    iconName: "TabeAIIcon"
  },
  {
    id: "cat-academico",
    label: "Académico",
    type: "category",
    iconName: "GraduationCap",
    items: [
      { id: "item-/carrera", path: "/carrera", label: "Plan de Carrera", type: "item", iconName: "GraduationCap" },
      { id: "item-/examenes", path: "/examenes", label: "Exámenes", type: "item", iconName: "GraduationCap" },
      { id: "item-/apuntes", path: "/apuntes", label: "Apuntes", type: "item", iconName: "ApuntesIcon" },
      { id: "item-/flashcards", path: "/flashcards", label: "Flashcards", type: "item", iconName: "Layers" },
      { id: "item-/cuestionarios", path: "/cuestionarios", label: "Cuestionarios", type: "item", iconName: "ClipboardList" },
      { id: "item-/consultas", path: "/consultas", label: "Consultas", type: "item", iconName: "Clock" },
      { id: "item-/biblioteca", path: "/biblioteca", label: "Biblioteca", type: "item", iconName: "Library" },
      { id: "item-/mapa", path: "/mapa", label: "Correlatividades", type: "item", iconName: "Compass" }
    ]
  },
  {
    id: "cat-organizacion",
    label: "Productividad",
    type: "category",
    iconName: "Calendar",
    items: [
      { id: "item-/calendario", path: "/calendario", label: "Calendario", type: "item", iconName: "Calendar" },
      { id: "item-/pomodoro", path: "/pomodoro", label: "Pomodoro", type: "item", iconName: "Timer" },
      { id: "item-/tareas", path: "/tareas", label: "Tareas", type: "item", iconName: "CheckSquare" },
      { id: "item-/rutinas", path: "/rutinas", label: "Rutinas", type: "item", iconName: "Repeat2" }
    ]
  },
  {
    id: "cat-comunidad",
    label: "Comunidad & Juegos",
    type: "category",
    iconName: "Arcade",
    items: [
      { id: "item-/amigos", path: "/amigos", label: "Amigos", type: "item", iconName: "Users" },
      { id: "item-/bosque", path: "/bosque", label: "Mi Bosque", type: "item", iconName: "TreeDeciduous" },
      { id: "item-/tabegochi", path: "/tabegochi", label: "TabeGochi", type: "item", iconName: "Sparkles" },
      { id: "item-/juegos", path: "/juegos", label: "Juegos", type: "item", iconName: "Arcade" },
      { id: "item-/logros", path: "/logros", label: "Logros", type: "item", iconName: "Trophy" },
      { id: "item-/marketplace", path: "/marketplace", label: "Comunidad", type: "item", iconName: "Store" }
    ]
  },
  {
    id: "item-/tabetalk",
    path: "/tabetalk",
    label: "Tabetalk",
    type: "item",
    iconName: "TabetalkIcon"
  },
  {
    id: "item-/metricas",
    path: "/metricas",
    label: "Métricas",
    type: "item",
    iconName: "BarChart3"
  },
  {
    id: "item-/configuracion",
    path: "/configuracion",
    label: "Configuración",
    type: "item",
    iconName: "Settings"
  }
];

export const baseNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", tourClass: "tour-sidebar-dashboard" },
  { icon: TabeAIIcon, label: "TABE IA", path: "/TABEAI", tourClass: "tour-sidebar-asistenteia" },
  { icon: GraduationCap, label: "Plan de Carrera", path: "/carrera", tourClass: "tour-sidebar-plan" },
  { icon: GraduationCap, label: "Exámenes", path: "/examenes", tourClass: "tour-sidebar-examenes" },
  { icon: Clock, label: "Consultas", path: "/consultas", tourClass: "tour-sidebar-consultas" },
  { icon: ApuntesIcon, label: "Apuntes", path: "/apuntes", tourClass: "tour-sidebar-apuntes tour-sidebar-notion" },
  { icon: Layers, label: "Flashcards", path: "/flashcards", tourClass: "tour-sidebar-flashcards" },
  { icon: ClipboardList, label: "Cuestionarios", path: "/cuestionarios", tourClass: "tour-sidebar-cuestionarios" },
  { icon: Store, label: "Comunidad", path: "/marketplace", tourClass: "tour-sidebar-marketplace" },
  { icon: Library, label: "Biblioteca", path: "/biblioteca", tourClass: "tour-sidebar-biblioteca" },
  { icon: Calendar, label: "Calendario", path: "/calendario", tourClass: "tour-sidebar-calendar" },
  { icon: Repeat2, label: "Rutinas", path: "/rutinas", tourClass: "tour-sidebar-rutinas" },
  { icon: Timer, label: "Pomodoro", path: "/pomodoro", tourClass: "tour-sidebar-pomodoro" },
  { icon: CheckSquare, label: "Tareas", path: "/tareas", tourClass: "tour-sidebar-tareas" },
  { icon: BarChart3, label: "Métricas", path: "/metricas", tourClass: "tour-sidebar-metricas" },
  { icon: TreeDeciduous, label: "Mi Bosque", path: "/bosque", tourClass: "tour-sidebar-bosque" },
  { icon: Trophy, label: "Logros", path: "/logros", tourClass: "tour-sidebar-logros" },
  { icon: Users, label: "Amigos", path: "/amigos", tourClass: "tour-sidebar-amigos" },
  { icon: TabetalkIcon, label: "Tabetalk", path: "/tabetalk", tourClass: "tour-sidebar-tabetalk" },
  { icon: ArcadeIcon, label: "Juegos", path: "/juegos", tourClass: "tour-sidebar-juegos" },
  { icon: Settings, label: "Configuración", path: "/configuracion", tourClass: "tour-sidebar-configuracion" },
];

export const adminNavItem = { icon: Shield, label: "Admin", path: "/admin" };

export const ALL_AVAILABLE_ITEMS = [
  ...baseNavItems,
  { icon: GraduationCap, label: "Exámenes", path: "/examenes" },
  { icon: Gamepad2, label: "Juegos", path: "/juegos" },
  { icon: Compass, label: "Correlatividades", path: "/mapa" }
];

/**
 * Ensures TABE IA is always properly structured, positioned 2nd (after Dashboard),
 * and eliminates any duplicate entries regardless of whether the config was loaded
 * from a user's previous cloud profile or local storage.
 */
export function ensureTabeAISecond(items: CustomSidebarItem[]): CustomSidebarItem[] {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return [...DEFAULT_CATEGORIZED_SIDEBAR];
  }

  // Recursive function to remove any TABEAI occurrences from root or categories
  const removeTabeAI = (list: CustomSidebarItem[]): CustomSidebarItem[] => {
    return list
      .filter(item => {
        const p = item.path || item.id;
        return p !== "/TABEAI" && item.id !== "item-/TABEAI" && item.label?.toLowerCase() !== "tabe ia" && item.label?.toLowerCase() !== "tabeai";
      })
      .map(item => {
        if (item.items && item.items.length > 0) {
          return {
            ...item,
            items: removeTabeAI(item.items)
          };
        }
        return item;
      });
  };

  const cleaned = removeTabeAI(items);

  const tabeAIItem: CustomSidebarItem = {
    id: "item-/TABEAI",
    path: "/TABEAI",
    label: "TABE IA",
    type: "item",
    iconName: "TabeAIIcon"
  };

  const dashIndex = cleaned.findIndex(i => i.path === "/dashboard" || i.id === "item-/dashboard");
  if (dashIndex !== -1) {
    cleaned.splice(dashIndex + 1, 0, tabeAIItem);
  } else {
    cleaned.splice(1, 0, tabeAIItem);
  }

  // Ensure /tareas is present in the sidebar
  const hasItemRecursively = (list: CustomSidebarItem[], targetPath: string): boolean => {
    return list.some(item => {
      const p = item.path || item.id;
      if (p === targetPath || item.id === `item-${targetPath}`) return true;
      if (item.items && item.items.length > 0) return hasItemRecursively(item.items, targetPath);
      return false;
    });
  };

  if (!hasItemRecursively(cleaned, "/tareas")) {
    const tareasItem: CustomSidebarItem = {
      id: "item-/tareas",
      path: "/tareas",
      label: "Tareas",
      type: "item",
      iconName: "CheckSquare"
    };

    // Find "Productividad" or "Organización" category (id: "cat-organizacion")
    const orgCat = cleaned.find(i => 
      i.type === "category" && 
      (i.id === "cat-organizacion" || 
       i.label?.toLowerCase().includes("productividad") || 
       i.label?.toLowerCase().includes("organiza") ||
       (i.items && i.items.some((sub: any) => (sub.path || sub.id) === "/pomodoro" || (sub.path || sub.id) === "/calendario" || (sub.path || sub.id) === "/rutinas")))
    );

    if (orgCat && orgCat.items) {
      const pomodoroIdx = orgCat.items.findIndex((sub: any) => (sub.path || sub.id) === "/pomodoro" || sub.id === "item-/pomodoro");
      if (pomodoroIdx !== -1) {
        orgCat.items.splice(pomodoroIdx + 1, 0, tareasItem);
      } else {
        orgCat.items.push(tareasItem);
      }
    } else {
      const firstCat = cleaned.find(i => i.type === "category" && i.items);
      if (firstCat && firstCat.items) {
        firstCat.items.push(tareasItem);
      } else {
        cleaned.push(tareasItem);
      }
    }
  }

  // Ensure /examenes is present in the sidebar
  if (!hasItemRecursively(cleaned, "/examenes")) {
    const examenesItem: CustomSidebarItem = {
      id: "item-/examenes",
      path: "/examenes",
      label: "Exámenes",
      type: "item",
      iconName: "GraduationCap"
    };

    // Find "Académico" category (id: "cat-academico")
    const acadCat = cleaned.find(i => 
      i.type === "category" && 
      (i.id === "cat-academico" || 
       i.label?.toLowerCase().includes("académ") || 
       i.label?.toLowerCase().includes("academ") ||
       (i.items && i.items.some((sub: any) => (sub.path || sub.id) === "/carrera" || (sub.path || sub.id) === "/apuntes")))
    );

    if (acadCat && acadCat.items) {
      const carreraIdx = acadCat.items.findIndex((sub: any) => (sub.path || sub.id) === "/carrera" || sub.id === "item-/carrera");
      if (carreraIdx !== -1) {
        acadCat.items.splice(carreraIdx + 1, 0, examenesItem);
      } else {
        acadCat.items.unshift(examenesItem);
      }
    } else {
      const firstCat = cleaned.find(i => i.type === "category" && i.items);
      if (firstCat && firstCat.items) {
        firstCat.items.push(examenesItem);
      } else {
        cleaned.push(examenesItem);
      }
    }
  }

  // Replace legacy /discord references with /tabetalk
  const replaceDiscordWithTabetalk = (list: CustomSidebarItem[]): CustomSidebarItem[] => {
    return list.map(item => {
      let updated = { ...item };
      if (updated.path === "/discord" || updated.id === "item-/discord") {
        updated.path = "/tabetalk";
        updated.id = "item-/tabetalk";
        updated.label = "Tabetalk";
        updated.iconName = "MessageSquare";
      }
      if (updated.items && updated.items.length > 0) {
        updated.items = replaceDiscordWithTabetalk(updated.items);
      }
      return updated;
    });
  };

  const migrated = replaceDiscordWithTabetalk(cleaned);

  // Remove Tabetalk from any category items so it becomes an independent root item
  const cleanTabetalkFromCategories = (list: CustomSidebarItem[]): CustomSidebarItem[] => {
    return list.map(item => {
      if (item.type === "category" && item.items) {
        return {
          ...item,
          iconName: (item.id === "cat-comunidad" || item.label?.toLowerCase().includes("comunidad") || item.label?.toLowerCase().includes("juego")) ? "Arcade" : item.iconName,
          items: item.items
            .filter(sub => (sub.path || sub.id) !== "/tabetalk" && sub.id !== "item-/tabetalk")
            .map(sub => {
              if ((sub.path || sub.id) === "/juegos" || sub.id === "item-/juegos" || sub.label?.toLowerCase().includes("juego")) {
                return { ...sub, iconName: "Arcade" };
              }
              return sub;
            })
        };
      }
      return item;
    });
  };

  const rootCleaned = cleanTabetalkFromCategories(migrated);

  // Ensure /tabetalk is present at the root level of the sidebar
  if (!rootCleaned.some(i => (i.path || i.id) === "/tabetalk" || i.id === "item-/tabetalk")) {
    const tabetalkItem: CustomSidebarItem = {
      id: "item-/tabetalk",
      path: "/tabetalk",
      label: "Tabetalk",
      type: "item",
      iconName: "TabetalkIcon"
    };

    // Insert after cat-comunidad if present, else before metricas or at end
    const comCatIdx = rootCleaned.findIndex(i => i.id === "cat-comunidad" || i.label?.toLowerCase().includes("comunidad") || i.label?.toLowerCase().includes("juego"));
    if (comCatIdx !== -1) {
      rootCleaned.splice(comCatIdx + 1, 0, tabetalkItem);
    } else {
      const metricasIdx = rootCleaned.findIndex(i => (i.path || i.id) === "/metricas" || i.id === "item-/metricas");
      if (metricasIdx !== -1) {
        rootCleaned.splice(metricasIdx, 0, tabetalkItem);
      } else {
        rootCleaned.push(tabetalkItem);
      }
    }
  }

  return rootCleaned;
}
