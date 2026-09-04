/**
 * TabIntro — plain-language header shown at the top of every Game Hub tab.
 *
 * Presentation only. Three short beginner sentences: what this is, when to
 * use it, what it gives you back.
 */
import { Info } from "lucide-react";

export function TabIntro({
  what,
  when,
  why,
}: {
  what: string;
  when?: string;
  why?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-xs leading-relaxed">
      <div className="flex gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{what}</p>
          {when && <p className="text-muted-foreground">{when}</p>}
          {why && <p className="text-muted-foreground">{why}</p>}
        </div>
      </div>
    </div>
  );
}

/** Small helper line placed under an input label. */
export function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>;
}
