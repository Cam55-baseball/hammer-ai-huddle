import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface TagWhyMeta {
  label: string;
  layer: string;
  key: string;
  description?: string | null;
  reasoning?: string | null;
  confidence?: number | null;
}

interface Props {
  meta: TagWhyMeta;
  className?: string;
}

/**
 * Inline "Why?" popover for a single taxonomy tag.
 * Shows: meaning (taxonomy.description), reasoning (suggestion.reasoning),
 * and the connected cue (layer + key).
 */
export function TagWhyPopover({ meta, className }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Why this tag: ${meta.label}`}
          onClick={(e) => e.stopPropagation()}
          className={
            "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground " +
            (className ?? "")
          }
        >
          <HelpCircle className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-xs space-y-2" align="start">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm">{meta.label}</p>
          {meta.confidence != null && (
            <Badge variant="outline" className="text-[10px]">
              {Math.round(meta.confidence * 100)}%
            </Badge>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">What it means</p>
          <p className="text-xs">{meta.description?.trim() || "No definition recorded for this tag yet."}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Why it applies</p>
          <p className="text-xs">{meta.reasoning?.trim() || "No Hammer rationale — owner pick."}</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Connected cue</p>
          <p className="font-mono text-[11px]">
            <span className="capitalize">{meta.layer.replace("_", " ")}</span>
            <span className="text-muted-foreground"> · </span>
            {meta.key}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
