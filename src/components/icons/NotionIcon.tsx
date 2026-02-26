import { cn } from "@/lib/utils";

interface ApuntesIconProps {
  className?: string;
}

/**
 * Custom "Apuntes" icon (replaces Notion logo).
 * A notebook with a pencil — represents notes & documents.
 */
export function NotionIcon({ className }: ApuntesIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-5 h-5", className)}
    >
      {/* Notebook */}
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      {/* Lines on page */}
      <line x1="9" y1="7" x2="16" y2="7" />
      <line x1="9" y1="11" x2="14" y2="11" />
      <line x1="9" y1="15" x2="12" y2="15" />
    </svg>
  );
}
