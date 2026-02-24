import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplitData {
  label: string;
  composite: number;
  volume: number;
  executionAvg: number;
}

interface SplitComparisonCardProps {
  splitA: SplitData;
  splitB: SplitData;
}

export function SplitComparisonCard({ splitA, splitB }: SplitComparisonCardProps) {
  const stronger = splitA.composite >= splitB.composite ? 'A' : 'B';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          Split Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <SplitColumn data={splitA} highlight={stronger === 'A'} />
          <div className="text-muted-foreground text-sm font-medium">vs</div>
          <SplitColumn data={splitB} highlight={stronger === 'B'} />
        </div>
      </CardContent>
    </Card>
  );
}

function SplitColumn({ data, highlight }: { data: SplitData; highlight: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3 text-center space-y-2', highlight && 'border-primary bg-primary/5')}>
      <p className="text-sm font-semibold">{data.label}</p>
      <p className="text-2xl font-bold">{data.composite}</p>
      <p className="text-xs text-muted-foreground">{data.volume} sessions • {data.executionAvg} avg</p>
    </div>
  );
}
