import { cn } from "@/lib/utils";

interface DiscordIconProps {
  className?: string;
}

export function DiscordIcon({ className }: DiscordIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-5 h-5", className)}
    >
      {/* Discord logo adapted to stroke style matching lucide icons */}
      <path d="M9.5 11.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="currentColor" stroke="none" />
      <path d="M14.5 11.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="currentColor" stroke="none" />
      <path d="M8.5 8.5c-1 .5-2 1.5-2.5 2.5-.5 2 0 5 1 7 1.5 1 3 1.5 4 1.5l1-2" />
      <path d="M15.5 8.5c1 .5 2 1.5 2.5 2.5.5 2 0 5-1 7-1.5 1-3 1.5-4 1.5l-1-2" />
      <path d="M9 8.5c1-.5 2-.5 3-.5s2 0 3 .5" />
      <path d="M8.5 8.5l.5-3c1-.5 2-.5 3-.5s2 0 3 .5l.5 3" />
    </svg>
  );
}
