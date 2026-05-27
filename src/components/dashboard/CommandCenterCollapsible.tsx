import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommandCenterSection } from "@/components/command/CommandCenterSection";

const STORAGE_KEY = "dashboard.commandcenter.open";

interface Props {
  defaultSignalsOpen?: boolean;
}

/**
 * UI-only collapsible wrapper around <CommandCenterSection />.
 * Visible chevron button pinned to the top-right corner.
 */
export function CommandCenterCollapsible({ defaultSignalsOpen = false }: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(open));
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Hide Command Center" : "Show Command Center"}
          className="flex w-full min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="min-w-0">
            <div className="text-base font-semibold text-foreground">Command Center</div>
            <div className="truncate text-sm text-muted-foreground">
              How your body is doing today
            </div>
          </div>
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm"
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
          <CommandCenterSection defaultSignalsOpen={defaultSignalsOpen} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
