import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhyExplanation, type WhySource } from '@/hooks/useWhyExplanation';

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  sourceType: WhySource;
  sourceId?: string;
}

const TITLE: Record<WhySource, string> = {
  hie: 'Why this prescription?',
  mpi: 'Why this MPI score?',
  hammer: 'Why this Hammer State?',
};

export function WhyExplanationSheet({ open, onOpenChange, sourceType, sourceId }: Props) {
  const w = useWhyExplanation(sourceType, sourceId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{TITLE[sourceType]}</SheetTitle>
          <SheetDescription>Real inputs, thresholds, and logic the engine used.</SheetDescription>
        </SheetHeader>

        {w.loading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logic</h4>
              <p className="rounded-lg border bg-muted/30 p-3 text-sm">{w.logic || 'No explanation available yet.'}</p>
            </section>

            {w.inputs.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inputs Used</h4>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Source</th>
                        <th className="px-2 py-1.5 text-left font-medium">Field</th>
                        <th className="px-2 py-1.5 text-right font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.inputs.map((inp, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1.5 font-mono text-[10px]">{inp.table}</td>
                          <td className="px-2 py-1.5">{inp.field}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{String(inp.value).slice(0, 40)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {w.thresholds.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thresholds Applied</h4>
                <div className="space-y-1">
                  {w.thresholds.map((t) => (
                    <div key={t.key} className="flex items-center justify-between rounded border bg-muted/20 px-2 py-1 text-xs">
                      <span className="font-mono">{t.key}</span>
                      <span className="font-semibold">{String(t.value).slice(0, 40)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {w.neuroTags.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neuro Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {w.neuroTags.map((t) => (<Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>))}
                </div>
              </section>
            )}

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence</h4>
              <Progress value={Math.round(w.confidence * 100)} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">{Math.round(w.confidence * 100)}% — more inputs = higher confidence.</p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
