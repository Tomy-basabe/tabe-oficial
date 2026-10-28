// Store y gestor de notificaciones in-app para TABE
// Diseñado para avisar al usuario cuando la IA finaliza tareas en segundo plano (consultas, parciales, quizzes, flashcards, etc.)

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: "ai_background" | "professors" | "calendar" | "quiz" | "flashcards" | "academic" | "system";
  actionTarget?: string;
  actionUrl?: string;
  progress: number; // 0 to 100
  status: "completed" | "processing";
  createdAt: number;
  read: boolean;
}

const STORAGE_KEY = "tabe_in_app_notifications";
const MAX_NOTIFICATIONS = 40;

// Reproduce un sonido sutil de campana/doble chime mediante Web Audio API nativo (0 dependencias)
export function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primer tono dulce (587.33 Hz - Re5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Segundo tono armónico más brillante (880 Hz - La5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.09, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (_) {
    // Si el navegador bloquea audio sin interacción previa, se ignora silenciosamente
  }
}

// Dispara notificación nativa del navegador / Service Worker si está autorizado
function triggerBrowserNotification(title: string, body: string, url?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    if (Notification.permission === "granted") {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: `tabe-ai-${Date.now()}`,
            data: { url: url || "/" },
          } as any);
        }).catch(() => {
          new Notification(title, { body, icon: "/pwa-192x192.png" });
        });
      } else {
        new Notification(title, { body, icon: "/pwa-192x192.png" });
      }
    }
  } catch (_) {}
}

export function getInAppNotifications(): InAppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function saveInAppNotifications(notifications: InAppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent("tabe:in-app-notification", { detail: trimmed }));
  } catch (_) {}
}

export function addInAppNotification(data: Omit<InAppNotification, "id" | "createdAt" | "read">): InAppNotification {
  const current = getInAppNotifications();
  const newNotif: InAppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    read: false,
    ...data,
  };

  const updated = [newNotif, ...current].slice(0, MAX_NOTIFICATIONS);
  saveInAppNotifications(updated);

  // Reproducir chime de aviso y notificación nativa al completar 100%
  if (newNotif.status === "completed" || newNotif.progress === 100) {
    playNotificationChime();
    triggerBrowserNotification(newNotif.title, newNotif.message, newNotif.actionUrl);
  }

  return newNotif;
}

export function markAsRead(id: string) {
  const current = getInAppNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveInAppNotifications(updated);
}

export function markAllAsRead() {
  const current = getInAppNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveInAppNotifications(updated);
}

export function clearInAppNotifications() {
  saveInAppNotifications([]);
}
