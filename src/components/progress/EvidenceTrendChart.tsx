import { CartesianGrid, Line, LineChart, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export interface EvidencePoint { label: string; value: number | null; source: string; date: string; sample?: number }

export function EvidenceTrendChart({ points, label, unit, bars = false }: { points: EvidencePoint[]; label: string; unit: string; bars?: boolean }) {
  const usable = points.filter(p => p.value !== null && Number.isFinite(p.value));
  if (!usable.length) return <p className="py-6 text-base text-muted-foreground">Not enough recorded data for this graph yet.</p>;
  const latest = usable[usable.length - 1];
  const axes = <><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} /><YAxis width={48} tickLine={false} axisLine={false} domain={bars ? [0, 'auto'] : ['auto', 'auto']} /><ChartTooltip content={<ChartTooltipContent formatter={(value, _name, item) => <div className="space-y-1"><p className="font-semibold">{label}: {Number(value).toFixed(2)} {unit}</p><p>{item.payload.date}</p><p>{item.payload.source}</p>{item.payload.sample != null && <p>Sample: {item.payload.sample}</p>}</div>} />} /></>;
  return <div className="min-w-0 space-y-2" aria-label={`${label} graph`}>
    <p className="text-base font-medium">{label} · {unit}</p>
    <ChartContainer className="h-48 w-full aspect-auto text-sm" config={{ value: { label, color: 'hsl(var(--primary))' } }}>
      {bars ? <BarChart accessibilityLayer data={points} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>{axes}<Bar dataKey="value" fill="var(--color-value)" radius={3} isAnimationActive={false} /></BarChart> : <LineChart accessibilityLayer data={points} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>{axes}<Line dataKey="value" type="linear" stroke="var(--color-value)" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} /></LineChart>}
    </ChartContainer>
    {usable.length === 1 && <p className="text-sm text-muted-foreground">One record — not a trend yet.</p>}
    {latest && <p className="text-sm leading-relaxed text-muted-foreground">Latest {label.toLowerCase()}: {latest.value?.toFixed(2)} {unit} · {latest.date} · Source: {latest.source}{latest.sample != null ? ` · Sample: ${latest.sample}` : ''}</p>}
  </div>;
}