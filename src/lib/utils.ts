import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toLocalDateStr(date: Date | string | null | undefined = new Date()): string {
  if (!date) return toLocalDateStr(new Date());
  if (typeof date === "string") {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    date = new Date(date);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
}

/**
 * Orquesta la animación de apertura y cierre de contenido (Pilar 4 de T.A.B.E.):
 * 1) Aplica apertura/cierre elástico al contenedor (.tabe-content-open) salvo que use slide/height propio
 * 2) Escala la aparición y repliegue de sus bloques hijos (.tabe-inner-section-reveal)
 * 3) Escala en cascada la entrada y salida de los botones/controles internos (.tabe-inner-btn-cascade)
 */
export function orchestrateContentOpen(
  node: HTMLElement | null,
  options?: { skipContainerClass?: boolean }
) {
  if (!node || node.dataset.contentOrchestrated === "1") return;
  node.dataset.contentOrchestrated = "1";
  if (!options?.skipContainerClass) {
    node.classList.add("tabe-content-open");
  }

  let secIdx = 0;
  const children = node.children;
  const maxChildren = Math.min(children.length, 6);
  for (let i = 0; i < maxChildren; i++) {
    const child = children[i];
    if (
      child instanceof HTMLElement &&
      !child.hasAttribute("data-radix-dialog-close") &&
      !child.classList.contains("sr-only")
    ) {
      child.style.setProperty("--sec-idx", String(Math.min(secIdx, 4)));
      child.classList.add("tabe-inner-section-reveal");
      secIdx++;
    }
  }

  const controls = node.querySelectorAll<HTMLElement>(
    'button, [role="menuitem"], [role="option"], [role="radio"]'
  );
  const maxControls = Math.min(controls.length, 10);
  let btnIdx = 0;
  for (let i = 0; i < maxControls; i++) {
    const btn = controls[i];
    if (btn.hasAttribute("data-radix-dialog-close")) continue;
    btn.style.setProperty("--btn-idx", String(Math.min(btnIdx, 7)));
    btn.classList.add("tabe-inner-btn-cascade");
    btnIdx++;
  }
}
