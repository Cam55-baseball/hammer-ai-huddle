/**
 * BeforeYouStartSection — one collapsible drawer that holds every
 * pre-work surface (notices, wisdom, performance context, start line,
 * Ask Hammer recall, plus accessible non-physical work). Due-today items
 * live in morning completion; phase and schedule live in Identity.
 *
 * Collapse affordance intentionally matches the game-plan cards:
 * a real, labelled Hide / Show button with a chevron. Defaults collapsed so
 * the Hammers Today plan itself is the immediate focus. Open state is
 * remembered per day only (localStorage), never server state.
 */
import { Children, isValidElement, useEffect, useState, type ReactNode } from "react";
import { bysLevel, type BysLevel } from "@/lib/hammer/beforeYouStartImportance";
import { useBysImportance } from "@/hooks/useBysImportance";
import { createPortal } from "react-dom";

import { ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/** Marks one "Before you start" item for the importance map. Renders its children unchanged. */
export function Bys({ children }: { id: string; children?: ReactNode }) {
  return <>{children}</>;
}

const LEVEL_STYLE: Record<BysLevel, string> = {
  1: "border-[hsl(var(--bys-level-1))] shadow-[0_0_14px_hsl(var(--bys-level-1)/0.45)]",
  2: "border-[hsl(var(--bys-level-2))] shadow-[0_0_14px_hsl(var(--bys-level-2)/0.45)]",
  3: "border-[hsl(var(--bys-level-3))] shadow-[0_0_14px_hsl(var(--bys-level-3)/0.45)]",
};

/** Groups marked items into Level 1 → 2 → 3 (owner map; unassigned → Level 2). Pure; tested. */
export function groupByLevel(children: ReactNode, saved: Record<string, unknown> | null | undefined) {
  const groups: Record<BysLevel, ReactNode[]> = { 1: [], 2: [], 3: [] };
  Children.toArray(children).forEach((c) => {
    const id = isValidElement(c) && c.type === Bys ? String((c.props as { id: string }).id) : "";
    groups[bysLevel(id, saved)].push(c);
  });
  return groups;
}

/** One Level drawer: closed by default, tap to open. Hides itself when every item inside renders nothing. */
export function LevelDrawer({ lv, open, onOpenChange, children }: { lv: BysLevel; open: boolean; onOpenChange: (o: boolean) => void; children: ReactNode }) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} asChild>
      <section data-bys-level={lv} aria-label={`Level ${lv}`}
        className={`rounded-lg border-2 p-2 [&:not(:has(>div>div>*))]:hidden ${LEVEL_STYLE[lv]}`}>
        <CollapsibleTrigger asChild>
          <button type="button" aria-expanded={open} className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Level {lv}</span>
            <span className="flex items-center gap-1 normal-case tracking-normal">{open ? "Hide" : "Show"}{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
          </button>
        </CollapsibleTrigger>
        {/* forceMount keeps items mounted (so empty drawers still hide); closed drawers are visually hidden. */}
        <CollapsibleContent forceMount className="data-[state=closed]:hidden">
          <div className="mt-2 space-y-2">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

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

  // Owner Nov 4 #6: each Level drawer starts closed; open state lives only while the page is open.
  const [levelOpen, setLevelOpen] = useState<Partial<Record<BysLevel, boolean>>>({});
  const importance = useBysImportance();
  const groups = groupByLevel(children, importance.data);
  const card = (
    <Card className="border-border/70 bg-muted/20">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">Before you start</div>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Today's preparation, mental work and profile reminders.
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
          <div className="space-y-3 border-t border-border/60 p-2 sm:p-3">
            {([1, 2, 3] as const).map((lv) => groups[lv].length ? (
              // A drawer whose items all decide not to show today hides itself.
              <LevelDrawer key={lv} lv={lv} open={!!levelOpen[lv]} onOpenChange={(o) => setLevelOpen((s) => ({ ...s, [lv]: o }))}>{groups[lv]}</LevelDrawer>
            ) : null)}
          </div>
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

