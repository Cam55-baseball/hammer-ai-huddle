/**
 * BeforeYouStartSection — one collapsible drawer that holds every
 * pre-work surface (due-today items, schedule, wisdom, HPI, start line,
 * Ask Hammer recall, plus the non-physical blocks: mental / vision / eating).
 *
 * Collapse affordance intentionally matches the game-plan cards:
 * a real, labelled Hide / Show button with a chevron. Defaults collapsed so
 * the Hammers Today plan itself is the immediate focus. Open state is
 * remembered per day only (localStorage), never server state.
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const dayKey = () =>
  `hammer.today.beforeYouStart.open.${new Date().toISOString().slice(0, 10)}`;

export function BeforeYouStartSection({
  children,
  portalTarget,
}: {
  children: ReactNode;
  portalTarget?: HTMLElement | null;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(dayKey()) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(dayKey(), open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  const card = (
    <Card className="border-border/70 bg-muted/20">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Before you start</div>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Due today, schedule, wisdom, performance signal, start line, Ask Hammer,
                mental / vision / eating.
              </p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={open}
              className="h-9 shrink-0 gap-1.5 font-semibold"
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {open ? "Hide" : "Show"}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="space-y-2 border-t border-border/60 p-2 sm:p-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  // Dashboard passes an explicit ref-backed host. Unlike the old one-shot
  // document lookup, this target is supplied by React when the host mounts and
  // remains correct across remounts. Never fall back inside Hammers Today while
  // that host is pending, because that would recreate the nesting bug.
  if (portalTarget === null) return null;
  return portalTarget ? createPortal(card, portalTarget) : card;
}

