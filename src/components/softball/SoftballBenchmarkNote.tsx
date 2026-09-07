import { Info } from "lucide-react";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { SOFTBALL_BENCHMARKS_PENDING_NOTE } from "@/lib/softball/lockedFeatures";

/**
 * Shown on surfaces that would otherwise display a scouting grade. Softball
 * has no seeded anchors, so the number is kept and the grade is withheld.
 */
export function SoftballBenchmarkNote({ className }: { className?: string }) {
  const { isSoftball } = useSportTheme();
  if (!isSoftball) return null;

  return (
    <p
      className={`flex items-start gap-2 text-xs text-muted-foreground ${className ?? ""}`}
    >
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{SOFTBALL_BENCHMARKS_PENDING_NOTE}</span>
    </p>
  );
}
