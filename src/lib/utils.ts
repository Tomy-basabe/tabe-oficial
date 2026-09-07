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

