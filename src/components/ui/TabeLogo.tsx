import { useTheme } from "@/hooks/useTheme";

interface TabeLogoProps {
  size?: number;
  className?: string;
  variant?: "default" | "ai";
}

/** TABE brand mark – renders correct logo adapted to light and dark theme */
export function TabeLogo({ size = 56, className = "", variant = "default" }: TabeLogoProps) {
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  let src = "/logo.png";
  if (variant === "ai") {
    src = isDark ? "/logos/tabe-ai-dark.png" : "/logos/tabe-ai-light.png";
  } else {
    src = isDark ? "/logos/tabe-logo-dark.png" : "/logos/tabe-logo-light.png";
  }

  return (
    <img
      src={src}
      alt="TABE"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={(e) => {
        // Fallback robusto al logo principal si no existiera la ruta
        (e.target as HTMLImageElement).src = "/logo.png";
      }}
    />
  );
}
