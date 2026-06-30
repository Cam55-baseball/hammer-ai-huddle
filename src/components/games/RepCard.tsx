/**
 * RepCard — shared Practice-Hub-style rep visual used by every Game Hub logger
 * (AtBat, Pitch, Defense, Baserun, Sub). One card = one rep / event.
 *
 * Logic stays in each logger; this component owns the look (numbered header,
 * badge row, action slot, optional notes). Keeps the Game Hub visually aligned
 * with the Practice Hub fill-out sheet.
 */
import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export interface RepCardProps {
  repNumber?: number;
  title: ReactNode;
  badges?: Array<{ label: ReactNode; variant?: "default" | "secondary" | "outline" | "destructive" }>;
  meta?: ReactNode;
  notes?: ReactNode;
  onDelete?: () => void;
  rightSlot?: ReactNode;
  children?: ReactNode;
  accent?: "hitting" | "pitching" | "defense" | "baserun" | "sub" | "neutral";
}

const ACCENT: Record<NonNullable<RepCardProps["accent"]>, string> = {
  hitting: "border-l-amber-500",
  pitching: "border-l-sky-500",
  defense: "border-l-emerald-500",
  baserun: "border-l-violet-500",
  sub: "border-l-slate-500",
  neutral: "border-l-primary",
};

export function RepCard({
  repNumber,
  title,
  badges,
  meta,
  notes,
  onDelete,
  rightSlot,
  children,
  accent = "neutral",
}: RepCardProps) {
  return (
    <Card className={`p-3 border-l-4 ${ACCENT[accent]} transition-colors hover:bg-muted/20`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            {typeof repNumber === "number" && (
              <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
                #{repNumber}
              </span>
            )}
            <span className="font-medium truncate">{title}</span>
            {badges?.map((b, i) => (
              <Badge key={i} variant={b.variant ?? "outline"} className="text-[10px]">
                {b.label}
              </Badge>
            ))}
          </div>
          {meta && <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">{meta}</div>}
          {children && <div className="mt-2">{children}</div>}
          {notes && <p className="mt-1.5 text-xs text-muted-foreground italic">{notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {rightSlot}
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={onDelete}
              aria-label="Delete rep"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Keyboard hint row — shown above each logger so users know the rep-sheet
 * shortcuts. Practice Hub uses the same shape.
 */
export function RepKeyboardHints({ hints }: { hints: Array<{ key: string; label: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {hints.map((h) => (
        <span key={h.key} className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">{h.key}</kbd>
          {h.label}
        </span>
      ))}
    </div>
  );
}
