import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CatcherMetricsProps {
  onUpdate: (data: Record<string, any>) => void;
}

const QUALITY_OPTIONS = ['Poor', 'Average', 'Good'];
const FRAME_RESULT = ['No Attempt', 'Missed', 'Borderline', 'Stolen Strike'];

function SelectGrid({ label, options, value, onChange, cols = 3 }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; cols?: number;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className={cn('grid gap-1 mt-1', `grid-cols-${cols}`)}>
        {options.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={cn('px-2 py-1 rounded text-xs font-medium border transition-all',
              value === o ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
            )}
          >{o}</button>
        ))}
      </div>
    </div>
  );
}

export function CatcherMetrics({ onUpdate }: CatcherMetricsProps) {
  const [data, setData] = useState<Record<string, any>>({});

  const update = (key: string, value: any) => {
    const next = { ...data, [key]: value };
    setData(next);
    onUpdate(next);
  };

  return (
    <Card className="border-orange-500/30">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs text-orange-600">🎯 Catcher Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Pop Time (sec)</Label>
            <Input type="number" step="0.01" className="h-7 text-xs" value={data.pop_time || ''} onChange={e => update('pop_time', e.target.value)} placeholder="e.g. 1.95" />
          </div>
          <div>
            <Label className="text-xs">Throw Down Time (sec)</Label>
            <Input type="number" step="0.01" className="h-7 text-xs" value={data.throw_down_time || ''} onChange={e => update('throw_down_time', e.target.value)} />
          </div>
        </div>
        <SelectGrid label="Exchange Quality" options={QUALITY_OPTIONS} value={data.exchange_quality || ''} onChange={v => update('exchange_quality', v)} />
        <SelectGrid label="Block Quality" options={QUALITY_OPTIONS} value={data.block_quality || ''} onChange={v => update('block_quality', v)} />
        <SelectGrid label="Framing Result" options={FRAME_RESULT} value={data.frame_result || ''} onChange={v => update('frame_result', v)} cols={4} />
        <SelectGrid label="Pitch Presentation Quality" options={QUALITY_OPTIONS} value={data.presentation_quality || ''} onChange={v => update('presentation_quality', v)} />
      </CardContent>
    </Card>
  );
}
