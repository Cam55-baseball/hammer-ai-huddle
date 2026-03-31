import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Dumbbell } from 'lucide-react';
import type { PlayerOverview } from '@/hooks/useCoachUDL';

interface Props {
  player: PlayerOverview;
}

const statusColors = {
  green: 'bg-green-500',
  yellow: 'bg-amber-500',
  red: 'bg-destructive',
};

const trendIcons = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const trendColors = {
  improving: 'text-green-600',
  declining: 'text-destructive',
  stable: 'text-muted-foreground',
};

export function PlayerUDLCard({ player }: Props) {
  const [expanded, setExpanded] = useState(false);
  const TrendIcon = trendIcons[player.trend];
  const primaryConstraint = player.constraints[0];
  const drills = (player.latest_plan?.prescribed_drills as any[]) ?? [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          {/* Status light */}
          <div className={`h-3 w-3 rounded-full shrink-0 ${statusColors[player.status_light]}`} />

          {/* Avatar + name */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={player.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {player.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{player.full_name}</p>
            {primaryConstraint && (
              <p className="text-xs text-muted-foreground truncate">{primaryConstraint.label}</p>
            )}
          </div>

          {/* Compliance + trend */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              {player.compliance_pct}%
            </Badge>
            <TrendIcon className={`h-4 w-4 ${trendColors[player.trend]}`} />
          </div>
        </div>

        {/* Expandable details */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Hide Details' : 'View Details'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Constraints */}
            {player.constraints.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Constraints</p>
                {player.constraints.map((c: any) => (
                  <div key={c.key} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">Score: {c.score}/100</span>
                  </div>
                ))}
              </div>
            )}

            {/* Prescribed drills */}
            {drills.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Prescribed Drills</p>
                {drills.map((d: any) => (
                  <div key={d.drill_key} className="flex items-center gap-2 text-xs border rounded px-2 py-1">
                    <Dumbbell className="h-3 w-3 text-primary shrink-0" />
                    <span className="flex-1">{d.drill_name}</span>
                    <Badge variant="secondary" className="text-[10px]">{d.constraint_label}</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Alerts for this player */}
            {player.alerts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">Active Alerts</p>
                {player.alerts.map((a: any) => (
                  <p key={a.id} className="text-xs text-muted-foreground">{a.message}</p>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
