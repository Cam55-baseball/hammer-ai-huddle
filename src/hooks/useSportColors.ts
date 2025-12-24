import { useSportTheme } from "@/contexts/SportThemeContext";

/**
 * Hook that provides sport-aware color classes.
 * Returns softball-specific colors (light pink, light yellow) when in softball mode,
 * and standard colors (red, amber) when in baseball mode.
 */
export function useSportColors() {
  const { isSoftball, sport } = useSportTheme();

  return {
    sport,
    isSoftball,
    
    // Primary color (red → light pink for softball)
    primaryText: isSoftball ? "text-pink-300" : "text-primary",
    primaryBg: isSoftball ? "bg-pink-300" : "bg-primary",
    primaryBgLight: isSoftball ? "bg-pink-300/10" : "bg-primary/10",
    primaryBgMedium: isSoftball ? "bg-pink-300/20" : "bg-primary/20",
    primaryBorder: isSoftball ? "border-pink-300" : "border-primary",
    primaryBorderLight: isSoftball ? "border-pink-300/20" : "border-primary/20",
    primaryRing: isSoftball ? "ring-pink-300" : "ring-primary",
    
    // Amber color (amber → light yellow for softball)
    amberText: isSoftball ? "text-yellow-200" : "text-amber-500",
    amberBg: isSoftball ? "bg-yellow-200" : "bg-amber-500",
    amberBgLight: isSoftball ? "bg-yellow-200/10" : "bg-amber-500/10",
    amberBgMedium: isSoftball ? "bg-yellow-200/20" : "bg-amber-500/20",
    amberBorder: isSoftball ? "border-yellow-200" : "border-amber-500",
    
    // Red variations (red → pink for softball)
    redText: isSoftball ? "text-pink-300" : "text-red-500",
    redBg: isSoftball ? "bg-pink-300" : "bg-red-500",
    redBgLight: isSoftball ? "bg-pink-300/10" : "bg-red-500/10",
    
    // For gradient classes
    gradientFrom: isSoftball ? "from-pink-300" : "from-primary",
    gradientTo: isSoftball ? "to-pink-400" : "to-primary/70",
  };
}
