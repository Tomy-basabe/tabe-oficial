import { cn } from "@/lib/utils";

export function TabetalkIcon({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <img
      src="/tabe-talk.png"
      alt="Tabetalk"
      className={cn("object-contain shrink-0", className)}
      style={{ width: size, height: size }}
      onError={(e) => {
        // Fallback to logo.png if tabe-talk.png fails
        e.currentTarget.src = "/logo.png";
      }}
    />
  );
}
