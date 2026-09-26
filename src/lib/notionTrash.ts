import { SupabaseClient } from "@supabase/supabase-js";
import { NotionDocument } from "@/hooks/useNotionDocuments";

export interface TrashItem {
  id: string;
  title: string;
  parentId: string | null;
  subjectId: string | null;
  emoji: string;
  deletedAt: number;
  expiresAt: number;
}

const TRASH_STORAGE_KEY = "tabe_notion_trash";
const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Helper to extract all subpage IDs referenced inside TipTap JSON content
 */
export function extractSubPageIds(content: any): string[] {
  const ids: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === "subPage" && node.attrs?.pageId) {
      ids.push(node.attrs.pageId);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }
  walk(content);
  return ids;
}

/**
 * Get all active trash items (cleans expired ones automatically)
 */
export function getTrashItems(): TrashItem[] {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    const items: TrashItem[] = JSON.parse(raw);
    const now = Date.now();
    return items.filter(item => item.expiresAt > now);
  } catch (e) {
    return [];
  }
}

/**
 * Check if a document is currently in trash
 */
export function isDocumentInTrash(id: string): boolean {
  const items = getTrashItems();
  return items.some(item => item.id === id);
}

/**
 * Move a document/subpage to the 30-minute trash
 */
export function moveToTrash(doc: {
  id: string;
  titulo?: string;
  parent_id?: string | null;
  subject_id?: string | null;
  emoji?: string;
}) {
  try {
    const current = getTrashItems().filter(item => item.id !== doc.id);
    const now = Date.now();
    const newItem: TrashItem = {
      id: doc.id,
      title: doc.titulo || "Sin título",
      parentId: doc.parent_id || null,
      subjectId: doc.subject_id || null,
      emoji: doc.emoji || "📝",
      deletedAt: now,
      expiresAt: now + GRACE_PERIOD_MS,
    };
    current.unshift(newItem);
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent("tabe-trash-updated"));
  } catch (e) {
    console.error("Error moving to trash:", e);
  }
}

/**
 * Restore a document from trash
 */
export function restoreFromTrash(id: string): TrashItem | null {
  try {
    const items = getTrashItems();
    const found = items.find(i => i.id === id) || null;
    if (found) {
      const remaining = items.filter(i => i.id !== id);
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(remaining));
      window.dispatchEvent(new CustomEvent("tabe-trash-updated"));
    }
    return found;
  } catch (e) {
    return null;
  }
}

/**
 * Permanently purge expired trash items from the database
 */
export async function purgeExpiredTrash(supabase: SupabaseClient) {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return;
    const items: TrashItem[] = JSON.parse(raw);
    const now = Date.now();
    const expired = items.filter(item => item.expiresAt <= now);
    const valid = items.filter(item => item.expiresAt > now);

    if (expired.length > 0) {
      localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(valid));
      window.dispatchEvent(new CustomEvent("tabe-trash-updated"));

      for (const item of expired) {
        try {
          // Delete children first
          await supabase.from("notion_documents").delete().eq("parent_id", item.id);
          // Delete document
          await supabase.from("notion_documents").delete().eq("id", item.id);
        } catch (err) {
          console.warn("Error purging expired document:", item.id, err);
        }
      }
    }
  } catch (e) {
    console.error("Error in purgeExpiredTrash:", e);
  }
}

/**
 * Permanently delete a specific document immediately from trash & DB
 */
export async function permanentlyDelete(id: string, supabase: SupabaseClient) {
  try {
    restoreFromTrash(id);
    await supabase.from("notion_documents").delete().eq("parent_id", id);
    await supabase.from("notion_documents").delete().eq("id", id);
    window.dispatchEvent(new CustomEvent("tabe-trash-updated"));
  } catch (e) {
    console.error("Error in permanentlyDelete:", e);
  }
}
