import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowRight,
  ChevronDown,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Video,
  Activity,
  Trophy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AthleteSummary } from '@/hooks/useCoachAthleteSummaries';

interface Props {
  athleteId: string;
  name: string;
  summary?: AthleteSummary;
}

function ago(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '—';
  }
}

// 20-80 scouting anchor colouring, same language as the athlete-facing surface.
function gradeTone(g: number): string {
  if (g >= 60) return 'text-emerald-500';
  if (g >= 50) return 'text-primary';
  if (g >= 40) return 'text-amber-500';
  return 'text-muted-foreground';
}

export function CoachAthleteScannableCard({ athleteId, name, summary }: Props) {
  const navigate = useNavigate();
  const grades = summary?.grades ?? [];

  return (
    <Card className="overflow-hidden">
      <Collapsible defaultOpen>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground">
                Official grades {summary?.lastEvaluatedAt ? `· last evaluated ${ago(summary.lastEvaluatedAt)}` : '· none on record'}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => navigate(`/coach/athlete/${athleteId}`)}>
                <span className="hidden sm:inline mr-1">Open</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Scannable activity strip — always visible */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-3 w-3" /> Sessions
              </div>
              <div className="font-semibold text-sm">{summary?.sessions30d ?? 0} <span className="font-normal text-muted-foreground">/30d</span></div>
              <div className="text-muted-foreground truncate">{ago(summary?.lastSessionAt ?? null)}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Video className="h-3 w-3" /> Video
              </div>
              <div className="font-semibold text-sm">{summary?.videos30d ?? 0} <span className="font-normal text-muted-foreground">/30d</span></div>
              <div className="text-muted-foreground truncate">{ago(summary?.lastVideoAt ?? null)}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Trophy className="h-3 w-3" /> Games
              </div>
              <div className="font-semibold text-sm">{summary?.games30d ?? 0} <span className="font-normal text-muted-foreground">/30d</span></div>
              <div className="text-muted-foreground truncate">
                {summary?.lastGame
                  ? `${summary.lastGame.opponent ?? 'Opponent'}${
                      summary.lastGame.myScore !== null && summary.lastGame.oppScore !== null
                        ? ` ${summary.lastGame.myScore}-${summary.lastGame.oppScore}`
                        : ''
                    }`
                  : '—'}
              </div>
            </div>
          </div>

          <CollapsibleContent className="space-y-3">
            {grades.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                No official grades on record. Coach evaluations and camera-measured grades appear here — athlete
                self-grades stay private to the athlete and are never shown to coaches.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {grades.map((g) => (
                  <div key={g.metric} className="rounded-md border p-2">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {g.label}
                      {g.source === 'cv_measured' && <ShieldCheck className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-bold ${gradeTone(g.current)}`}>{g.current}</span>
                      {g.delta === null ? (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Minus className="h-3 w-3" /> first
                        </span>
                      ) : g.delta > 0 ? (
                        <span className="text-[11px] text-emerald-500 flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> +{g.delta}
                        </span>
                      ) : g.delta < 0 ? (
                        <span className="text-[11px] text-destructive flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" /> {g.delta}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Minus className="h-3 w-3" /> 0
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{ago(g.gradedAt)}</div>
                  </div>
                ))}
              </div>
            )}

            {summary?.lastSessionModule && (
              <Badge variant="secondary" className="text-[11px] capitalize">
                Last module: {summary.lastSessionModule}
              </Badge>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
