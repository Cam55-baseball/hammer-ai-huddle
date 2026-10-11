import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Log drafts stay mounted; toggles never force scrolling or share parent state. */
export function ExerciseDisclosure({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return <div data-exercise-disclosure data-state={open ? "open" : "closed"} className="[overflow-anchor:none]">
    <Button type="button" variant="ghost" data-exercise-toggle aria-expanded={open} aria-controls={bodyId}
      onClick={() => setOpen((value) => !value)}
      className="h-auto min-h-11 w-full justify-between gap-2 whitespace-normal px-0 text-left text-sm font-semibold">
      <span className="min-w-0 flex-1 break-words">{name}</span>
      <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
    </Button>
    <div id={bodyId} hidden={!open} data-exercise-body className="mt-2 space-y-2">{children}</div>
  </div>;
}