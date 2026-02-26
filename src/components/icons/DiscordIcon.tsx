import { cn } from "@/lib/utils";

interface ComunidadIconProps {
  className?: string;
}

/**
 * Custom "Comunidad" icon (replaces Discord logo).
 * A speech bubble with signal waves — represents community & voice chat.
 */
export function DiscordIcon({ className }: ComunidadIconProps) {
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
      {/* Chat bubble */}
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      {/* Signal/voice waves */}
      <path d="M9 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="currentColor" stroke="none" />
      <path d="M15 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="currentColor" stroke="none" />
      <path d="M12 10v2" />
    </svg>
  );
}
