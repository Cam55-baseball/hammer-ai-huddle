import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Lock, Star, Bookmark, FileText, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Trend = 'rising' | 'steady' | 'cooling';
type Player = {
  id: string;
  name: string;
  pos: string;
  age: number;
  mpi: number;
  trend: Trend;
  delta: number;
  tools: { label: string; value: number }[];
  recentLines: string[];
  badge?: string;
  note: string;
};

const PLAYERS: Player[] = [
  {
    id: '4',
    name: 'A. Patel',
    pos: 'SS',
    age: 16,
    mpi: 88,
    trend: 'rising',
    delta: 18,
    tools: [
      { label: 'Hit', value: 92 },
      { label: 'Field', value: 86 },
      { label: 'Speed', value: 81 },
    ],
    recentLines: ['3-for-4, 2B, BB', '2-for-3, HR', '1-for-3, RBI'],
    badge: 'Elite Move',
    note: 'P1+P4 chain locked. Hands stay loaded under fastball tempo. Projects to D1 middle-IF profile.',
  },
  {
    id: '12',
    name: 'M. Reyes',
    pos: 'OF',
    age: 16,
    mpi: 71,
    trend: 'cooling',
    delta: -6,
    tools: [
      { label: 'Speed', value: 88 },
      { label: 'Arm', value: 82 },
      { label: 'Hit', value: 64 },
    ],
    recentLines: ['1-for-4, K', '0-for-3, BB', '1-for-4'],
    note: 'Hands break early — P1 Hip Load deficit. Plus-plus runner; corner-OF tools intact.',
  },
  {
    id: '9',
    name: 'J. Mendez',
    pos: 'RHP',
    age: 17,
    mpi: 84,
    trend: 'rising',
    delta: 9,
    tools: [
      { label: 'Velo', value: 90 },
      { label: 'Cmd', value: 78 },
      { label: 'Spin', value: 84 },
    ],
    recentLines: ['5 IP, 7 K, 1 BB', '4 IP, 5 K, 2 BB', '6 IP, 9 K'],
    badge: 'Velo Tier+',
    note: 'CNS load running hot — manage bullpen volume. FB/SL tunnel is real, change still developing.',
  },
  {
    id: '15',
    name: 'D. Brooks',
    pos: '1B',
    age: 15,
    mpi: 76,
    trend: 'rising',
    delta: 11,
    tools: [
      { label: 'Power', value: 85 },
      { label: 'Hit', value: 74 },
      { label: 'Field', value: 70 },
    ],
    recentLines: ['2-for-3, HR', '1-for-2, 2B, BB', '2-for-4, RBI'],
    note: 'Plus raw power, trending hit-tool gains over last 14d. Watch BB% jump.',
  },
  {
    id: '22',
    name: 'L. Vega',
    pos: 'C',
    age: 17,
    mpi: 73,
    trend: 'steady',
    delta: 1,
    tools: [
      { label: 'Field', value: 84 },
      { label: 'Arm', value: 86 },
      { label: 'Hit', value: 67 },
    ],
    recentLines: ['1-for-3, BB', '2-for-4', '1-for-4, K'],
    note: 'Pop-time consistent at 1.92. Bat is the swing skill — keep eyes on Q4 progression.',
  },
];

const TREND_META: Record<Trend, { icon: any; cls: string; label: string }> = {
  rising: { icon: TrendingUp, cls: 'text-emerald-500 bg-emerald-500/10', label: 'Rising' },
  steady: { icon: Minus, cls: 'text-muted-foreground bg-muted', label: 'Steady' },
  cooling: { icon: TrendingDown, cls: 'text-amber-500 bg-amber-500/10', label: 'Cooling' },
};

type SortKey = 'mpi' | 'trend' | 'recent';

function LockedAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" disabled>
              <Icon className="h-3.5 w-3.5" />
              {label}
              <Lock className="ml-1 h-3 w-3 opacity-60" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Unlocks with Scout seat</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ScoutFeedDemo() {
  const [sort, setSort] = useState<SortKey>('mpi');
  const [selectedId, setSelectedId] = useState<string>(PLAYERS[0].id);

  const sorted = useMemo(() => {
    const list = [...PLAYERS];
    if (sort === 'mpi') list.sort((a, b) => b.mpi - a.mpi);
    else if (sort === 'trend') list.sort((a, b) => b.delta - a.delta);
    else list.sort((a, b) => Number(b.id) - Number(a.id));
    return list;
  }, [sort]);

  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0];

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Scout Feed</span>
              <Badge variant="secondary" className="text-[10px]">
                Scout view
              </Badge>
            </div>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" /> Preview
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['mpi', 'trend', 'recent'] as SortKey[]).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={sort === k ? 'default' : 'outline'}
                className="h-7 text-[11px] capitalize"
                onClick={() => setSort(k)}
              >
                {k === 'mpi' ? 'Sort: MPI' : k === 'trend' ? 'Sort: Trend' : 'Recently active'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-2">
            {sorted.map((p) => {
              const T = TREND_META[p.trend];
              const Icon = T.icon;
              const active = p.id === selected.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    'w-full rounded-md border p-2.5 text-left transition-colors',
                    active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        #{p.id} {p.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.pos} · age {p.age}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-lg font-black leading-none">{p.mpi}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                          T.cls,
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {p.delta > 0 ? `+${p.delta}` : p.delta} · {T.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-black">
                  #{selected.id} {selected.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.pos} · age {selected.age} · MPI{' '}
                  <span className="font-mono font-bold text-foreground">{selected.mpi}</span>
                </p>
              </div>
              {selected.badge && (
                <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                  <Star className="h-3 w-3" /> {selected.badge}
                </Badge>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tools
              </p>
              <div className="space-y-1.5">
                {selected.tools.map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-xs">
                    <span className="w-12 shrink-0 font-medium">{t.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${t.value}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[11px]">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Last 3 lines
              </p>
              <ul className="space-y-0.5 text-xs">
                {selected.recentLines.map((l, i) => (
                  <li key={i} className="font-mono text-muted-foreground">
                    · {l}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border bg-muted/30 p-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Scouting note
              </p>
              <p className="text-xs leading-relaxed">{selected.note}</p>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t pt-2">
              <LockedAction icon={UserPlus} label="Follow" />
              <LockedAction icon={Bookmark} label="Save to list" />
              <LockedAction icon={FileText} label="Generate report" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Preview only — Follow, Save, and Report generation unlock with a Scout seat.
        </p>
      </div>
    </div>
  );
}
