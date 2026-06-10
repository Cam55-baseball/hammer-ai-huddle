import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { ReportCardTileSpec } from "@/lib/reportCard";

interface Props {
  spec: ReportCardTileSpec | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TileExplainerSheet({ spec, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        {spec && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl">{spec.name}</SheetTitle>
              <SheetDescription className="text-xs uppercase tracking-wider">
                Standard: {spec.standard}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <Section title="What it is &amp; why it matters" body={spec.explainer.whatWhy} />
              <Section title="How to improve it" body={spec.explainer.howToImprove} />
              <Section title="Trend vs prior sessions" body="Your trend across recent submissions will appear here as you build history." muted />
              <Section title="Keep going" body={spec.explainer.encouragement} accent />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, body, muted, accent }: { title: string; body: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : undefined}>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <p className={muted ? "text-sm text-muted-foreground" : "text-sm leading-relaxed"}>{body}</p>
    </div>
  );
}
