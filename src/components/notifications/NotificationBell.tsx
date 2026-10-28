import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Layers,
  CheckSquare,
  Bot,
  Sparkles,
  Trash2,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  InAppNotification,
  getInAppNotifications,
  markAsRead,
  markAllAsRead,
  clearInAppNotifications,
} from "@/lib/notificationsStore";

interface NotificationBellProps {
  className?: string;
  variant?: "header" | "sidebar" | "compact";
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return "Hace un momento";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function getNotificationIcon(type: InAppNotification["type"]) {
  switch (type) {
    case "professors":
      return <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "calendar":
      return <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "quiz":
      return <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case "flashcards":
      return <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "ai_background":
    default:
      return <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
  }
}

export function NotificationBell({ className, variant = "header" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => getInAppNotifications());
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  useEffect(() => {
    const handleNotificationUpdate = () => {
      setNotifications(getInAppNotifications());
      setHasNewAlert(true);
      const timer = setTimeout(() => setHasNewAlert(false), 2500);
      return () => clearTimeout(timer);
    };

    window.addEventListener("tabe:in-app-notification", handleNotificationUpdate);
    window.addEventListener("storage", handleNotificationUpdate);

    return () => {
      window.removeEventListener("tabe:in-app-notification", handleNotificationUpdate);
      window.removeEventListener("storage", handleNotificationUpdate);
    };
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Al abrir, marcamos como leídas tras una breve pausa para que el usuario note las que eran nuevas
      setTimeout(() => {
        markAllAsRead();
        setNotifications(getInAppNotifications());
      }, 1200);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
    setNotifications(getInAppNotifications());
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearInAppNotifications();
    setNotifications([]);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
          title={unreadCount > 0 ? `${unreadCount} notificaciones nuevas` : "Centro de notificaciones"}
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all cursor-pointer focus:outline-hidden",
            variant === "header" &&
              "w-8 h-8 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 active:scale-95 shadow-2xs",
            variant === "sidebar" &&
              "w-9 h-9 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100",
            variant === "compact" &&
              "w-7 h-7 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-lg",
            className
          )}
        >
          <Bell
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              unreadCount > 0 && "text-amber-500 dark:text-amber-400 stroke-[2.2]",
              hasNewAlert && "animate-bounce"
            )}
          />

          {/* Badge contador de no leídos */}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full text-[10px] font-bold text-white bg-red-500 shadow-xs flex items-center justify-center border-2 border-white dark:border-zinc-900",
                hasNewAlert && "scale-110 ring-2 ring-red-400 ring-offset-1"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[330px] sm:w-[380px] p-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl shadow-xl overflow-hidden z-[1050]"
      >
        {/* Header del centro de notificaciones */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {unreadCount} nueva{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 px-2 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-lg cursor-pointer"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Leídas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                title="Limpiar todo el historial"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Notificaciones */}
        <ScrollArea className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {notifications.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Sin notificaciones pendientes
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px]">
                Cuando le pidas a la IA registrar consultas, parciales o cuestionarios en segundo plano, te avisaremos acá al 100%.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) {
                    markAsRead(notif.id);
                    setNotifications(getInAppNotifications());
                  }
                }}
                className={cn(
                  "p-3.5 flex items-start gap-3 transition-colors text-left",
                  !notif.read
                    ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08]"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                )}
              >
                {/* Icono de categoría */}
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-words mb-2">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between gap-2">
                    {/* Badge 100% cargada */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      100% cargada
                    </span>

                    {/* Botón de acceso directo a la vista correspondiente */}
                    {notif.actionUrl && (
                      <Link
                        to={notif.actionUrl}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-2 py-0.5 rounded-md transition-all active:scale-95"
                      >
                        <span>Ver</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Indicador de no leído */}
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
