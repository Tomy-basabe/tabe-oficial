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
  Brain, Target, Lightbulb, Rocket, Book, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Bell, Heart, Star, Flame,
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, CheckCircle2,
  Search
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
  Trophy, Brain, Target, Lightbulb, Rocket, Book, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Users, Bell, Search, Settings, Heart, Star, Flame, Zap,
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, Folder, CheckCircle2,
  NotionIcon, Shield
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export const DEFAULT_ICON_MAPPING: Record<string, string> = {
  "/dashboard": "LayoutDashboard",
  "/carrera": "GraduationCap",
  "/consultas": "Clock",
  "/notion": "NotionIcon",
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
  "/asistente": "Bot",
  "/admin": "Shield",
  "/configuracion": "Settings"
};

export const baseNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", tourClass: "tour-sidebar-dashboard" },
  { icon: GraduationCap, label: "Plan de Carrera", path: "/carrera", tourClass: "tour-sidebar-plan" },
  { icon: Clock, label: "Consultas", path: "/consultas", tourClass: "tour-sidebar-consultas" },
  { icon: NotionIcon, label: "Apuntes", path: "/notion", tourClass: "tour-sidebar-notion" },
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
  { icon: Bot, label: "Asistente IA", path: "/asistente", tourClass: "tour-sidebar-asistenteia" },
  { icon: Settings, label: "Configuración", path: "/configuracion", tourClass: "tour-sidebar-configuracion" },
];

export const adminNavItem = { icon: Shield, label: "Admin", path: "/admin" };

export const ALL_AVAILABLE_ITEMS = [
  ...baseNavItems
];
