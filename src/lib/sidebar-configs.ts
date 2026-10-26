import { LayoutDashboard, GraduationCap, Calendar, Timer, BarChart3, Bot, Settings, Zap, Layers, ClipboardList, Library, Trophy, Shield, Users, Store, TreeDeciduous, Repeat2, Clock, Folder, Brain, Target, Lightbulb, Rocket, Book, BookOpen, PenTool, Microscope, FlaskConical, Calculator, Music, Video, Camera, MessageSquare, Bell, Heart, Star, Flame, Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, CheckCircle2, CheckSquare, Search, Compass, Award, Bookmark, Globe } from "lucide-react";
import { 
  UniversidadCatIcon,
  EstudioCatIcon,
  PlanCarreraIcon, 
  ExamenesIcon, 
  BibliotecaCustomIcon, 
  CorrelatividadesCustomIcon,
  ProductividadCatIcon,
  RecreacionCatIcon,
  DashboardCustomIcon,
  ComunidadCustomIcon,
  AmigosCustomIcon
} from "@/components/icons/TabeSectionIcons";
import { ApuntesIcon, NotionIcon } from "@/components/icons/NotionIcon";
import { TabeAIIcon } from "@/components/icons/TabeAIIcon";
import { TabetalkIcon } from "@/components/icons/TabetalkIcon";
import { ArcadeIcon } from "@/components/icons/ArcadeIcon";
import { ComunidadIcon } from "@/components/icons/ComunidadIcon";

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
  GraduationCap, LayoutDashboard, Clock, FileText: ClipboardList, Layers, ClipboardList, Store, Library, Calendar, Award,
  Trophy, Brain, Target, Lightbulb, Rocket, Book, BookOpen, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Users, Bell, Search, Settings, Heart, Star, Flame, Zap, Bookmark,
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, Folder, CheckCircle2, CheckSquare,
  ApuntesIcon, NotionIcon: ApuntesIcon, TabeAIIcon, TabetalkIcon, Tabetalk: TabetalkIcon,
  Shield, Compass, Bot: TabeAIIcon, Repeat2, Timer, BarChart3, TreeDeciduous, Globe,
  Arcade: ArcadeIcon, ArcadeIcon,
  ComunidadIcon: ComunidadCustomIcon, Comunidad: ComunidadCustomIcon,
  AmigosIcon: AmigosCustomIcon, Amigos: AmigosCustomIcon,
  AmigosCustomIcon,
  ComunidadCustomIcon,
  UniversidadCatIcon,
  EstudioCatIcon,
  Estudio: EstudioCatIcon,
  PlanCarreraIcon,
  ExamenesIcon,
  BibliotecaCustomIcon,
  CorrelatividadesCustomIcon,
  ProductividadCatIcon,
  RecreacionCatIcon,
  DashboardCustomIcon
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const DEFAULT_ICON_MAPPING: Record<string, string> = {
  "/dashboard": "DashboardCustomIcon",
  "/campus": "Globe",
  "/carrera": "PlanCarreraIcon",
  "/consultas": "Clock",
  "/apuntes": "ApuntesIcon",
  "/flashcards": "Layers",
  "/cuestionarios": "ClipboardList",
  "/comunidad": "ComunidadCustomIcon",
  "/marketplace": "ComunidadCustomIcon",
  "/biblioteca": "BibliotecaCustomIcon",
  "/calendario": "Calendar",
  "/rutinas": "Repeat2",
  "/pomodoro": "Timer",
  "/tareas": "CheckSquare",
  "/metricas": "BarChart3",
  "/bosque": "TreeDeciduous",
  "/logros": "Trophy",
  "/amigos": "AmigosCustomIcon",
  "/TABEAI": "TabeAIIcon",
  "/tabe-admin": "Shield",
  "/configuracion": "Settings",
  "/examenes": "ExamenesIcon",
  "/juegos": "Arcade",
  "/mapa": "CorrelatividadesCustomIcon"
};

export const DEFAULT_CATEGORIZED_SIDEBAR: CustomSidebarItem[] = [
  {
    id: "item-/dashboard",
    path: "/dashboard",
    label: "Dashboard",
    type: "item",
    iconName: "DashboardCustomIcon"
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
    iconName: "UniversidadCatIcon",
    items: [
      { id: "item-/campus", path: "/campus", label: "Mi Campus", type: "item", iconName: "Globe" },
      { id: "item-/carrera", path: "/carrera", label: "Plan de Carrera", type: "item", iconName: "PlanCarreraIcon" },
      { id: "item-/examenes", path: "/examenes", label: "Exámenes", type: "item", iconName: "ExamenesIcon" },
      { id: "item-/consultas", path: "/consultas", label: "Consultas", type: "item", iconName: "Clock" },
      { id: "item-/mapa", path: "/mapa", label: "Correlatividades", type: "item", iconName: "CorrelatividadesCustomIcon" }
    ]
  },
  {
    id: "cat-estudio",
    label: "Estudio",
    type: "category",
    iconName: "EstudioCatIcon",
    items: [
      { id: "item-/apuntes", path: "/apuntes", label: "Apuntes", type: "item", iconName: "ApuntesIcon" },
      { id: "item-/flashcards", path: "/flashcards", label: "Flashcards", type: "item", iconName: "Layers" },
      { id: "item-/cuestionarios", path: "/cuestionarios", label: "Cuestionarios", type: "item", iconName: "ClipboardList" },
      { id: "item-/biblioteca", path: "/biblioteca", label: "Biblioteca", type: "item", iconName: "BibliotecaCustomIcon" }
    ]
  },
  {
    id: "cat-organizacion",
    label: "Productividad",
    type: "category",
    iconName: "ProductividadCatIcon",
    items: [
      { id: "item-/calendario", path: "/calendario", label: "Calendario", type: "item", iconName: "Calendar" },
      { id: "item-/pomodoro", path: "/pomodoro", label: "Pomodoro", type: "item", iconName: "Timer" },
      { id: "item-/tareas", path: "/tareas", label: "Tareas", type: "item", iconName: "CheckSquare" },
      { id: "item-/rutinas", path: "/rutinas", label: "Rutinas", type: "item", iconName: "Repeat2" }
    ]
  },
  {
    id: "cat-comunidad",
    label: "Juegos & Recreación",
    type: "category",
    iconName: "RecreacionCatIcon",
    items: [
      { id: "item-/bosque", path: "/bosque", label: "Mi Bosque", type: "item", iconName: "TreeDeciduous" },
      { id: "item-/juegos", path: "/juegos", label: "Juegos", type: "item", iconName: "Arcade" },
      { id: "item-/logros", path: "/logros", label: "Logros", type: "item", iconName: "Trophy" }
    ]
  },
  {
    id: "item-/metricas",
    path: "/metricas",
    label: "Métricas",
    type: "item",
    iconName: "BarChart3"
  },
  {
    id: "item-/amigos",
    path: "/amigos",
    label: "Amigos",
    type: "item",
    iconName: "Users"
  },
  {
    id: "item-/comunidad",
    path: "/comunidad",
    label: "Comunidad",
    type: "item",
    iconName: "ComunidadIcon"
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
  { icon: DashboardCustomIcon, label: "Dashboard", path: "/dashboard", tourClass: "tour-sidebar-dashboard" },
  { icon: TabeAIIcon, label: "TABE IA", path: "/TABEAI", tourClass: "tour-sidebar-asistenteia" },
  { icon: PlanCarreraIcon, label: "Plan de Carrera", path: "/carrera", tourClass: "tour-sidebar-plan" },
  { icon: Globe, label: "Mi Campus", path: "/campus", tourClass: "tour-sidebar-campus" },
  { icon: ExamenesIcon, label: "Exámenes", path: "/examenes", tourClass: "tour-sidebar-examenes" },
  { icon: Clock, label: "Consultas", path: "/consultas", tourClass: "tour-sidebar-consultas" },
  { icon: ApuntesIcon, label: "Apuntes", path: "/apuntes", tourClass: "tour-sidebar-apuntes tour-sidebar-notion" },
  { icon: Layers, label: "Flashcards", path: "/flashcards", tourClass: "tour-sidebar-flashcards" },
  { icon: ClipboardList, label: "Cuestionarios", path: "/cuestionarios", tourClass: "tour-sidebar-cuestionarios" },
  { icon: ComunidadCustomIcon, label: "Comunidad", path: "/comunidad", tourClass: "tour-sidebar-comunidad" },
  { icon: BibliotecaCustomIcon, label: "Biblioteca", path: "/biblioteca", tourClass: "tour-sidebar-biblioteca" },
  { icon: CorrelatividadesCustomIcon, label: "Correlatividades", path: "/mapa", tourClass: "tour-sidebar-mapa" },
  { icon: Calendar, label: "Calendario", path: "/calendario", tourClass: "tour-sidebar-calendar" },
  { icon: Repeat2, label: "Rutinas", path: "/rutinas", tourClass: "tour-sidebar-rutinas" },
  { icon: Timer, label: "Pomodoro", path: "/pomodoro", tourClass: "tour-sidebar-pomodoro" },
  { icon: CheckSquare, label: "Tareas", path: "/tareas", tourClass: "tour-sidebar-tareas" },
  { icon: BarChart3, label: "Métricas", path: "/metricas", tourClass: "tour-sidebar-metricas" },
  { icon: TreeDeciduous, label: "Mi Bosque", path: "/bosque", tourClass: "tour-sidebar-bosque" },
  { icon: Trophy, label: "Logros", path: "/logros", tourClass: "tour-sidebar-logros" },
  { icon: AmigosCustomIcon, label: "Amigos", path: "/amigos", tourClass: "tour-sidebar-amigos" },
  { icon: ArcadeIcon, label: "Juegos", path: "/juegos", tourClass: "tour-sidebar-juegos" },
  { icon: Settings, label: "Configuración", path: "/configuracion", tourClass: "tour-sidebar-configuracion" },
];

export const adminNavItem = { icon: Shield, label: "Admin", path: "/tabe-admin" };

export const ALL_AVAILABLE_ITEMS: NavItem[] = [
  ...baseNavItems,
];

/**
 * Normaliza la estructura del sidebar para todos los usuarios:
 * - Asegura que TABE IA esté en 2da posición (después de Dashboard)
 * - Elimina /tabetalk y /discord del menú (accesible solo por enlace directo)
 * - Migra rutas heredadas (/marketplace -> /comunidad, /notion -> /apuntes, /asistente -> /TABEAI)
 * - Garantiza que todos los apartados del sistema estén presentes en cualquier cuenta
 */
export function ensureTabeAISecond(items: CustomSidebarItem[]): CustomSidebarItem[] {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return DEFAULT_CATEGORIZED_SIDEBAR.map(i => (i.items ? { ...i, items: [...i.items] } : { ...i }));
  }

  // 1. Limpiar ocurrencias de TABEAI, Tabetalk y Discord, y migrar rutas heredadas
  const sanitizeAndClean = (list: CustomSidebarItem[]): CustomSidebarItem[] => {
    return list
      .filter(item => {
        const p = item.path || item.id;
        const lbl = item.label?.toLowerCase() || "";
        if (
          p === "/TABEAI" ||
          p === "/asistente" ||
          item.id === "item-/TABEAI" ||
          lbl === "tabe ia" ||
          lbl === "tabeai" ||
          p === "/tabetalk" ||
          p === "/discord" ||
          p === "/tabegochi" ||
          item.id === "item-/tabetalk" ||
          item.id === "item-/discord" ||
          item.id === "item-/tabegochi" ||
          lbl === "tabetalk" ||
          lbl === "discord" ||
          lbl === "tabegochi" ||
          lbl === "tabe-gotchi"
        ) {
          return false;
        }
        return true;
      })
      .map(item => {
        let updated: CustomSidebarItem = { ...item };

        if (updated.path === "/notion" || updated.id === "item-/notion") {
          updated.path = "/apuntes";
          updated.id = "item-/apuntes";
          updated.iconName = "ApuntesIcon";
        }

        if (
          updated.path === "/marketplace" ||
          updated.id === "item-/marketplace" ||
          updated.label?.toLowerCase() === "marketplace" ||
          updated.iconName === "Store" ||
          ((updated.path === "/comunidad" || updated.id === "item-/comunidad") && updated.iconName === "Users")
        ) {
          updated.path = "/comunidad";
          updated.id = "item-/comunidad";
          if (updated.label?.toLowerCase() === "marketplace") updated.label = "Comunidad";
          if (updated.iconName === "Store" || updated.iconName === "Users" || updated.iconName === "ComunidadIcon") updated.iconName = "ComunidadCustomIcon";
        }

        if ((updated.path || updated.id) === "/juegos" || updated.id === "item-/juegos") {
          updated.iconName = "Arcade";
        }

        // Asignar los iconos correspondientes a cada ruta
        const targetPath = updated.path || updated.id;
        const targetLabel = updated.label?.toLowerCase() || "";

        if (targetPath === "/examenes" || targetPath === "item-/examenes" || targetLabel === "exámenes" || targetLabel === "examenes") {
          updated.iconName = "ExamenesIcon";
        } else if (targetPath === "/carrera" || targetPath === "item-/carrera" || targetLabel.includes("carrera")) {
          updated.iconName = "PlanCarreraIcon";
        } else if (targetPath === "/amigos" || targetPath === "item-/amigos" || targetLabel === "amigos") {
          updated.iconName = "AmigosCustomIcon";
        } else if (targetPath === "/comunidad" || targetPath === "item-/comunidad" || targetLabel === "comunidad") {
          updated.iconName = "ComunidadCustomIcon";
        } else if (targetPath === "/biblioteca" || targetPath === "item-/biblioteca" || targetLabel === "biblioteca") {
          updated.iconName = "BibliotecaCustomIcon";
        } else if (targetPath === "/mapa" || targetPath === "item-/mapa" || targetLabel.includes("correlat")) {
          updated.iconName = "CorrelatividadesCustomIcon";
        } else if (targetPath === "/dashboard" || targetPath === "item-/dashboard" || targetLabel === "dashboard") {
          updated.iconName = "DashboardCustomIcon";
        }

        if (updated.type === "category") {
          if (updated.id === "cat-academico" || targetLabel.includes("académ") || targetLabel.includes("academ") || targetLabel.includes("universidad")) {
            updated.iconName = "UniversidadCatIcon";
          } else if (updated.id === "cat-estudio" || targetLabel.includes("estudio")) {
            updated.iconName = "EstudioCatIcon";
          } else if (updated.id === "cat-organizacion" || targetLabel.includes("productividad") || targetLabel.includes("organiza")) {
            updated.iconName = "ProductividadCatIcon";
          } else if (updated.id === "cat-comunidad" || targetLabel.includes("juego") || targetLabel.includes("recrea")) {
            updated.iconName = "RecreacionCatIcon";
          }
        }

        if (updated.type === "category" && updated.items) {
          updated = {
            ...updated,
            items: sanitizeAndClean(updated.items)
          };
        }

        return updated;
      });
  };

  const cleaned = sanitizeAndClean(items);

  // 2. Asegurar Dashboard primero y TABE IA segundo
  if (!cleaned.some(i => (i.path || i.id) === "/dashboard" || i.id === "item-/dashboard")) {
    cleaned.unshift({
      id: "item-/dashboard",
      path: "/dashboard",
      label: "Dashboard",
      type: "item",
      iconName: "DashboardCustomIcon"
    });
  }

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

  const hasItemRecursively = (list: CustomSidebarItem[], targetPath: string): boolean => {
    return list.some(item => {
      const p = item.path || item.id;
      if (p === targetPath || item.id === `item-${targetPath}`) return true;
      if (item.items && item.items.length > 0) return hasItemRecursively(item.items, targetPath);
      return false;
    });
  };

  // 3. Separar apartados de Estudio de Académico si estaban mezclados dentro de cat-academico
  const STUDY_PATHS = ["/apuntes", "/flashcards", "/cuestionarios", "/biblioteca"];
  const studyItemsToMigrate: CustomSidebarItem[] = [];

  cleaned.forEach(cat => {
    if (
      cat.type === "category" &&
      cat.items &&
      (cat.id === "cat-academico" ||
        cat.label?.toLowerCase().includes("académ") ||
        cat.label?.toLowerCase().includes("academ"))
    ) {
      const remaining: CustomSidebarItem[] = [];
      cat.items.forEach(sub => {
        const p = sub.path || sub.id;
        if (
          STUDY_PATHS.includes(p) ||
          STUDY_PATHS.some(sp => sub.id === `item-${sp}`) ||
          sub.label?.toLowerCase() === "apuntes" ||
          sub.label?.toLowerCase() === "flashcards" ||
          sub.label?.toLowerCase() === "cuestionarios" ||
          sub.label?.toLowerCase() === "biblioteca"
        ) {
          studyItemsToMigrate.push(sub);
        } else {
          remaining.push(sub);
        }
      });
      cat.items = remaining;
    }
  });

  // Asegurar que exista cat-estudio y esté ubicado justo después de cat-academico
  let estudioCat = cleaned.find(
    c =>
      c.type === "category" &&
      (c.id === "cat-estudio" || c.label?.toLowerCase().includes("estudio"))
  );

  if (!estudioCat) {
    estudioCat = {
      id: "cat-estudio",
      label: "Estudio",
      type: "category",
      iconName: "EstudioCatIcon",
      items: []
    };
    const academicoIdx = cleaned.findIndex(
      c =>
        c.type === "category" &&
        (c.id === "cat-academico" ||
          c.label?.toLowerCase().includes("académ") ||
          c.label?.toLowerCase().includes("academ"))
    );
    if (academicoIdx !== -1) {
      cleaned.splice(academicoIdx + 1, 0, estudioCat);
    } else {
      const metricasIdx = cleaned.findIndex(
        i => (i.path || i.id) === "/metricas" || i.id === "item-/metricas"
      );
      if (metricasIdx !== -1) {
        cleaned.splice(metricasIdx, 0, estudioCat);
      } else {
        cleaned.push(estudioCat);
      }
    }
  }

  if (!estudioCat.items) estudioCat.items = [];

  // Mover los items de estudio migrados a cat-estudio
  studyItemsToMigrate.forEach(migrated => {
    const p = migrated.path || migrated.id;
    if (!estudioCat!.items!.some(sub => (sub.path || sub.id) === p || sub.id === migrated.id)) {
      estudioCat!.items!.push(migrated);
    }
  });

  // 4. Promover /amigos y /comunidad al nivel raíz si estaban dentro de cat-comunidad
  cleaned.forEach(item => {
    if (item.type === "category" && item.items && item.id === "cat-comunidad") {
      item.items = item.items.filter(sub => {
        const p = sub.path || sub.id;
        return p !== "/amigos" && p !== "/comunidad" && sub.id !== "item-/amigos" && sub.id !== "item-/comunidad";
      });
    }
  });

  // 5. Garantizar que todas las categorías y apartados de DEFAULT_CATEGORIZED_SIDEBAR existan
  for (const defEntry of DEFAULT_CATEGORIZED_SIDEBAR) {
    if (defEntry.type === "category" && defEntry.items) {
      let targetCat = cleaned.find(
        c =>
          c.type === "category" &&
          (c.id === defEntry.id ||
            (defEntry.id === "cat-academico" && (c.label?.toLowerCase().includes("académ") || c.label?.toLowerCase().includes("academ"))) ||
            (defEntry.id === "cat-estudio" && c.label?.toLowerCase().includes("estudio")) ||
            (defEntry.id === "cat-organizacion" && (c.label?.toLowerCase().includes("productividad") || c.label?.toLowerCase().includes("organiza"))) ||
            (defEntry.id === "cat-comunidad" && (c.label?.toLowerCase().includes("juego") || c.label?.toLowerCase().includes("comunidad"))))
      );

      if (!targetCat) {
        targetCat = {
          id: defEntry.id,
          label: defEntry.label,
          type: "category",
          iconName: defEntry.iconName,
          items: []
        };
        const metricasIdx = cleaned.findIndex(i => (i.path || i.id) === "/metricas" || i.id === "item-/metricas");
        if (metricasIdx !== -1) {
          cleaned.splice(metricasIdx, 0, targetCat);
        } else {
          cleaned.push(targetCat);
        }
      }

      if (!targetCat.items) targetCat.items = [];

      for (const subItem of defEntry.items) {
        if (subItem.path && !hasItemRecursively(cleaned, subItem.path)) {
          targetCat.items.push({ ...subItem });
        }
      }
    } else if (defEntry.type === "item" && defEntry.path) {
      if (!hasItemRecursively(cleaned, defEntry.path)) {
        const configIdx = cleaned.findIndex(i => (i.path || i.id) === "/configuracion" || i.id === "item-/configuracion");
        if (configIdx !== -1 && defEntry.path !== "/configuracion") {
          cleaned.splice(configIdx, 0, { ...defEntry });
        } else {
          cleaned.push({ ...defEntry });
        }
      }
    }
  }

  return cleaned;
}
