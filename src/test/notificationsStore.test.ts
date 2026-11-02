import { describe, it, expect, beforeEach } from "vitest";
import {
  addInAppNotification,
  getInAppNotifications,
  markAsRead,
  toggleNotificationRead,
  deleteInAppNotification,
  clearInAppNotifications,
} from "@/lib/notificationsStore";

describe("Notifications Store & Management", () => {
  beforeEach(() => {
    clearInAppNotifications();
  });

  it("adds and retrieves in-app notifications", () => {
    const notif = addInAppNotification({
      title: "Parcial Agendado",
      message: "Análisis Matemático II el 15/11",
      type: "calendar",
      actionUrl: "/calendario",
      progress: 100,
      status: "completed",
    });

    const list = getInAppNotifications();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(notif.id);
    expect(list[0].read).toBe(false);
  });

  it("toggles read status and marks as read", () => {
    const notif = addInAppNotification({
      title: "Nuevo Cuestionario",
      message: "Quiz de Física I",
      type: "quiz",
      actionUrl: "/cuestionarios",
      progress: 100,
      status: "completed",
    });

    markAsRead(notif.id);
    let list = getInAppNotifications();
    expect(list[0].read).toBe(true);

    toggleNotificationRead(notif.id);
    list = getInAppNotifications();
    expect(list[0].read).toBe(false);
  });

  it("deletes individual notifications", () => {
    const n1 = addInAppNotification({
      title: "Notif 1",
      message: "M1",
      type: "academic",
      progress: 100,
      status: "completed",
    });
    const n2 = addInAppNotification({
      title: "Notif 2",
      message: "M2",
      type: "academic",
      progress: 100,
      status: "completed",
    });

    deleteInAppNotification(n1.id);
    const list = getInAppNotifications();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(n2.id);
  });
});
