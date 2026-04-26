import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TIER_LABEL, TIER_CLASSES, type ConfidenceTier } from "@/lib/videoConfidence";

interface Props {
  score: number;
  tier: ConfidenceTier;
  className?: string;
  /** When true, shows only the score number, not the tier label. */
  compact?: boolean;
  title?: string;
}

export function ConfidenceBadge({ score, tier, className, compact, title }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] gap-1 border",
        TIER_CLASSES[tier],
        className,
      )}
      title={title ?? `${TIER_LABEL[tier]} · ${score}/100`}
    >
      <Sparkles className="h-3 w-3" />
      {compact ? `${score}` : `${score} · ${TIER_LABEL[tier]}`}
    </Badge>
  );
}
