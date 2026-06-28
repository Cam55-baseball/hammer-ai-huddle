/**
 * TopicPanel — shared accordion shell for a Progress topic.
 * Renders snapshot widgets, auto correlations, optional explorer,
 * and inline HammerChat scoped to this topic.
 */
import { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { ChevronDown, LucideIcon } from "lucide-react";
import { HammerChat, type HammerCategoryFocus } from "@/components/hammer/HammerChat";

interface Props {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: LucideIcon;
  readonly priorityBadge?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly snapshot: ReactNode;
  readonly correlations?: ReactNode;
  readonly explorer?: ReactNode;
  readonly hammerFocus: HammerCategoryFocus;
}

export function TopicPanel({
  id,
  title,
  subtitle,
  icon: Icon,
  priorityBadge,
  open,
  onOpenChange,
  snapshot,
  correlations,
  explorer,
  hammerFocus,
}: Props) {
  return (
    <section id={`topic-${id}`} className="scroll-mt-20">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <Card className="border-primary/20 overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left hover:bg-muted/40 transition-colors"
              aria-expanded={open}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-full bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg">{title}</h3>
                    {priorityBadge && (
                      <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5">
                        {priorityBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 sm:px-5 pb-5 pt-2 border-t border-border/40 space-y-5">
              <div>{snapshot}</div>

              {correlations && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What's correlated
                  </h4>
                  {correlations}
                </div>
              )}

              {explorer && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Explore correlations
                  </h4>
                  {explorer}
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ask Hammer about this
                </h4>
                <HammerChat compact categoryFocus={hammerFocus} />
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  );
}
