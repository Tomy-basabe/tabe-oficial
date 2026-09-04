import { useTheme } from "@/hooks/useTheme";

/** TABE brand mark – renders correct logo for current theme */
export function TabeLogo({ size = 56, className = "" }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const src = "/logo.png"; // Using the new unified clear theme logo for both light and dark

  return (
    <img
      src={src}
      alt="TABE"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
