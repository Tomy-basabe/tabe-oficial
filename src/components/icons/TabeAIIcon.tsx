import { cn } from "@/lib/utils";

interface TabeAIIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Proprietary TABE Neural AI Logo (custom engineered for TABE)
 * Symmetrical 4-loop quantum vortex with central radiant intelligence spark.
 */
export function TabeAIIcon({ className, ...props }: TabeAIIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("w-4 h-4 shrink-0 transition-transform duration-200", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Central Radiant Intelligence Spark */}
      <path d="M12 7.2C12 9.85 9.85 12 7.2 12C9.85 12 12 14.15 12 16.8C12 14.15 14.15 12 16.8 12C14.15 12 12 9.85 12 7.2Z" />

      {/* 4 Interlocking Orbital Neural Ribbons (Rotational 90° Symmetry) */}
      <path d="M12 2.2C16.86 2.2 20.8 6.14 20.8 11C20.8 12.6 20.35 14.1 19.55 15.4L17.2 14.05C17.7 13.15 18 12.1 18 11C18 7.69 15.31 5 12 5C10.9 5 9.85 5.3 8.95 5.8L7.6 3.45C8.9 2.65 10.4 2.2 12 2.2Z" />
      <path d="M21.8 12C21.8 16.86 17.86 20.8 13 20.8C11.4 20.8 9.9 20.35 8.6 19.55L9.95 17.2C10.85 17.7 11.9 18 13 18C16.31 18 19 15.31 19 12C19 10.9 18.7 9.85 18.2 8.95L20.55 7.6C21.35 8.9 21.8 10.4 21.8 12Z" />
      <path d="M12 21.8C7.14 21.8 3.2 17.86 3.2 13C3.2 11.4 3.65 9.9 4.45 8.6L6.8 9.95C6.3 10.85 6 11.9 6 13C6 16.31 8.69 19 12 19C13.1 19 14.15 18.7 15.05 18.2L16.4 20.55C15.1 21.35 13.6 21.8 12 21.8Z" />
      <path d="M2.2 12C2.2 7.14 6.14 3.2 11 3.2C12.6 3.2 14.1 3.65 15.4 4.45L14.05 6.8C13.15 6.3 12.1 6 11 6C7.69 6 5 8.69 5 12C5 13.1 5.3 14.15 5.8 15.05L3.45 16.4C2.65 15.1 2.2 13.6 2.2 12Z" />
    </svg>
  );
}

export default TabeAIIcon;
