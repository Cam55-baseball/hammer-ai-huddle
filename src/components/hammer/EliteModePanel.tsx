import { useEliteLayer } from '@/hooks/useEliteLayer';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATE_BORDER: Record<string, string> = {
  prime: 'border-t-primary',
  ready: 'border-t-emerald-500',
  caution: 'border-t-amber-500',
  recover: 'border-t-rose-500',
};

export function EliteModePanel() {
  const { layer } = useEliteLayer();
  if (!layer) return null;

  return (
    <Card
      className={cn(
        'border-t-2 animate-in fade-in duration-200',
        STATE_BORDER[layer.state] ?? 'border-t-border'
      )}
    >
      <CardContent className="p-3 sm:p-4 space-y-1">
        <p className="text-sm font-semibold leading-tight">{layer.elite_message}</p>
        <p className="text-xs text-muted-foreground leading-tight">{layer.micro_directive}</p>
        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full mt-1">
          <AlertCircle className="h-3 w-3" />
          {layer.constraint_text}
        </div>
      </CardContent>
    </Card>
  );
}
