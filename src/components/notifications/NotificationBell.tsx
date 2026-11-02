import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Calendar,
  GraduationCap,
  Layers,
  CheckSquare,
  Sparkles,
  Trash2,
  CheckCheck,
  Check,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  BookOpen,
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
  toggleNotificationRead,
  deleteInAppNotification,
  markAllAsRead,
  clearInAppNotifications,
} from "@/lib/notificationsStore";

interface NotificationBellProps {
  className?: string;
  variant?: "header" | "sidebar" | "compact";
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return "Ahora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
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
    case "academic":
      return <BookOpen className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case "ai_background":
    default:
      return <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
  }
}

export function NotificationBell({ className, variant = "header" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => getInAppNotifications());
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

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

  const displayedNotifications = useMemo(() => {
    if (filterTab === "unread") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filterTab]);

  const handleToggleRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleNotificationRead(id);
    setNotifications(getInAppNotifications());
  };

  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteInAppNotification(id);
    setNotifications(getInAppNotifications());
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
        className="w-[330px] sm:w-[380px] p-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-2xl overflow-hidden z-[1050]"
      >
        {/* Header superior */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
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
                  className="h-6 px-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 rounded-md cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3 h-3 mr-1 text-emerald-500" />
                  Leídas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-1.5 text-[11px] font-medium text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md cursor-pointer"
                  title="Borrar todas las notificaciones"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Vaciar
                </Button>
              )}
            </div>
          </div>

          {/* Selector de pestañas: Todas / No leídas */}
          <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "flex-1 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer text-center",
                filterTab === "all"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("unread")}
              className={cn(
                "flex-1 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer text-center",
                filterTab === "unread"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              No leídas ({unreadCount})
            </button>
          </div>
        </div>

        {/* Lista de notificaciones */}
        <ScrollArea className="max-h-[350px] overflow-y-auto">
          {displayedNotifications.length === 0 ? (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2 text-zinc-400">
                <Bell className="w-4 h-4 stroke-[1.5]" />
              </div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {filterTab === "unread" ? "¡Todo al día!" : "Sin notificaciones pendientes"}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-[220px]">
                {filterTab === "unread"
                  ? "No tenés notificaciones pendientes de lectura."
                  : "Acá verás avisos de exámenes, consultas y tareas de la IA."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) {
                      markAsRead(notif.id);
                      setNotifications(getInAppNotifications());
                    }
                  }}
                  className={cn(
                    "p-3 flex items-start gap-3 transition-colors text-left group relative",
                    !notif.read
                      ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.06] hover:bg-amber-500/[0.08]"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  )}
                >
                  {/* Ícono temático */}
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 font-mono">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug break-words">
                      {notif.message}
                    </p>

                    {/* Acciones de la tarjeta */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100/80 dark:border-zinc-800/60">
                      {notif.actionUrl ? (
                        <Link
                          to={notif.actionUrl}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-colors"
                        >
                          <span>Abrir</span>
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        </Link>
                      ) : (
                        <span />
                      )}

                      {/* Botones de acción individual: Marcar Leído / Borrar */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(e, notif.id)}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                          title={notif.read ? "Marcar como no leída" : "Marcar como leída"}
                        >
                          {notif.read ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOne(e, notif.id)}
                          className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Eliminar notificación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Indicador visual de no leído */}
                  {!notif.read && (
                    <span
                      className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-400/20"
                      title="No leída"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
