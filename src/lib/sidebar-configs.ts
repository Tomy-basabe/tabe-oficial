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
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, CheckCircle2,
  Search, Compass
} from "lucide-react";
import { NotionIcon } from "@/components/icons/NotionIcon";

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
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, Folder, CheckCircle2,
  NotionIcon, Shield, Compass, Bot, Repeat2, Timer, BarChart3, TreeDeciduous
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const DEFAULT_ICON_MAPPING: Record<string, string> = {
  "/dashboard": "LayoutDashboard",
  "/carrera": "GraduationCap",
  "/consultas": "Clock",
  "/apuntes": "NotionIcon",
  "/flashcards": "Layers",
  "/cuestionarios": "ClipboardList",
  "/marketplace": "Store",
  "/biblioteca": "Library",
  "/calendario": "Calendar",
  "/rutinas": "Repeat2",
  "/pomodoro": "Timer",
  "/metricas": "BarChart3",
  "/bosque": "TreeDeciduous",
  "/logros": "Trophy",
  "/amigos": "Users",
  "/TABEAI": "Bot",
  "/admin": "Shield",
  "/configuracion": "Settings",
  "/examenes": "GraduationCap",
  "/juegos": "Gamepad2",
  "/mapa": "Compass",
  "/discord": "MessageSquare"
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
    iconName: "Bot"
  },
  {
    id: "cat-academico",
    label: "Académico",
    type: "category",
    iconName: "GraduationCap",
    items: [
      { id: "item-/carrera", path: "/carrera", label: "Plan de Carrera", type: "item", iconName: "GraduationCap" },
      { id: "item-/apuntes", path: "/apuntes", label: "Apuntes", type: "item", iconName: "NotionIcon" },
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
      { id: "item-/rutinas", path: "/rutinas", label: "Rutinas", type: "item", iconName: "Repeat2" }
    ]
  },
  {
    id: "cat-comunidad",
    label: "Comunidad & Juegos",
    type: "category",
    iconName: "Gamepad2",
    items: [
      { id: "item-/amigos", path: "/amigos", label: "Amigos", type: "item", iconName: "Users" },
      { id: "item-/bosque", path: "/bosque", label: "Mi Bosque", type: "item", iconName: "TreeDeciduous" },
      { id: "item-/juegos", path: "/juegos", label: "Juegos", type: "item", iconName: "Gamepad2" },
      { id: "item-/logros", path: "/logros", label: "Logros", type: "item", iconName: "Trophy" },
      { id: "item-/marketplace", path: "/marketplace", label: "Marketplace", type: "item", iconName: "Store" }
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
    id: "item-/configuracion",
    path: "/configuracion",
    label: "Configuración",
    type: "item",
    iconName: "Settings"
  }
];

export const baseNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", tourClass: "tour-sidebar-dashboard" },
  { icon: GraduationCap, label: "Plan de Carrera", path: "/carrera", tourClass: "tour-sidebar-plan" },
  { icon: Clock, label: "Consultas", path: "/consultas", tourClass: "tour-sidebar-consultas" },
  { icon: NotionIcon, label: "Apuntes", path: "/apuntes", tourClass: "tour-sidebar-notion" },
  { icon: Layers, label: "Flashcards", path: "/flashcards", tourClass: "tour-sidebar-flashcards" },
  { icon: ClipboardList, label: "Cuestionarios", path: "/cuestionarios", tourClass: "tour-sidebar-cuestionarios" },
  { icon: Store, label: "Marketplace", path: "/marketplace", tourClass: "tour-sidebar-marketplace" },
  { icon: Library, label: "Biblioteca", path: "/biblioteca", tourClass: "tour-sidebar-biblioteca" },
  { icon: Calendar, label: "Calendario", path: "/calendario", tourClass: "tour-sidebar-calendar" },
  { icon: Repeat2, label: "Rutinas", path: "/rutinas", tourClass: "tour-sidebar-rutinas" },
  { icon: Timer, label: "Pomodoro", path: "/pomodoro", tourClass: "tour-sidebar-pomodoro" },
  { icon: BarChart3, label: "Métricas", path: "/metricas", tourClass: "tour-sidebar-metricas" },
  { icon: TreeDeciduous, label: "Mi Bosque", path: "/bosque", tourClass: "tour-sidebar-bosque" },
  { icon: Trophy, label: "Logros", path: "/logros", tourClass: "tour-sidebar-logros" },
  { icon: Users, label: "Amigos", path: "/amigos", tourClass: "tour-sidebar-amigos" },
  { icon: Gamepad2, label: "Juegos", path: "/juegos", tourClass: "tour-sidebar-juegos" },
  { icon: Bot, label: "TABEAI", path: "/TABEAI", tourClass: "tour-sidebar-asistenteia" },
  { icon: Settings, label: "Configuración", path: "/configuracion", tourClass: "tour-sidebar-configuracion" },
];

export const adminNavItem = { icon: Shield, label: "Admin", path: "/admin" };

export const ALL_AVAILABLE_ITEMS = [
  ...baseNavItems,
  { icon: GraduationCap, label: "Exámenes", path: "/examenes" },
  { icon: Gamepad2, label: "Juegos", path: "/juegos" },
  { icon: Compass, label: "Correlatividades", path: "/mapa" }
];
