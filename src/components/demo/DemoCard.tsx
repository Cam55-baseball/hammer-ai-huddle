import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Lock } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  tagline?: string | null;
  iconName?: string | null;
  viewed?: boolean;
  locked?: boolean;
  onClick?: () => void;
  trailing?: string;
}

export function DemoCard({ title, tagline, iconName, viewed, locked, onClick, trailing }: Props) {
  const Icon = (iconName && (Icons as any)[iconName]) || Icons.Sparkles;
  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
        viewed && 'border-primary/40 bg-primary/5',
      )}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold">{title}</h3>
            {viewed && <Check className="h-3.5 w-3.5 text-primary" />}
            {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          {tagline && <p className="truncate text-xs text-muted-foreground">{tagline}</p>}
        </div>
        {trailing && <Badge variant="outline" className="text-[10px]">{trailing}</Badge>}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
