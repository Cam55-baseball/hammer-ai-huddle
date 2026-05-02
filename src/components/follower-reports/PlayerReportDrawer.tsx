import { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Trophy, Activity } from 'lucide-react';
import { useFollowerReport, useMarkReportViewed } from '@/hooks/useFollowerReports';
import { format } from 'date-fns';

interface Props {
  reportId: string | null;
  role: 'scout' | 'coach';
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const PlayerReportDrawer = ({ reportId, role, open, onOpenChange }: Props) => {
  const { data, isLoading } = useFollowerReport(reportId);
  const markViewed = useMarkReportViewed();

  if (!reportId) return null;

  useEffect(() => {
    if (open && reportId && data?.report && !data.report.viewed_at) {
      markViewed.mutate(reportId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportId, data?.report?.id]);

  const report = data?.report;
  const player = data?.player;
  const rd = report?.report_data ?? {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {isLoading || !report ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {player?.full_name ?? 'Unknown Player'}
                <Badge variant="outline" className="text-xs">
                  {report.report_type === 'weekly_digest' ? 'Weekly' : 'Monthly'}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {format(new Date(report.period_start), 'MMM d')} – {format(new Date(report.period_end), 'MMM d, yyyy')}
                {rd.snapshot?.position && ` · ${rd.snapshot.position}`}
                {rd.snapshot?.sport && ` · ${rd.snapshot.sport}`}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 mt-6">
              {/* Headline Verdict */}
              <Section title="Verdict" icon={<Activity className="h-4 w-4" />}>
                <p className="text-sm leading-relaxed">{rd?.headline ?? report?.headline ?? 'No headline available'}</p>
              </Section>

              {/* Period Metrics */}
              <Section title="Period Activity" icon={<Activity className="h-4 w-4" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat label="Sessions" value={rd.period_metrics?.sessions_count ?? 0} />
                  <Stat label="Games" value={rd.period_metrics?.games_count ?? 0} />
                  <Stat label="Avg BQI" value={rd.period_metrics?.avg_bqi ?? '—'} />
                  <Stat label="Avg PEI" value={rd.period_metrics?.avg_pei ?? '—'} />
                  <Stat label="Avg FQI" value={rd.period_metrics?.avg_fqi ?? '—'} />
                </div>
              </Section>

              {/* Tool Grades */}
              {rd.tool_grades && Object.keys(rd.tool_grades).length > 0 && (
                <Section title="Tool Grades (20–80)" icon={<Trophy className="h-4 w-4" />}>
                  <div className="space-y-1.5">
                    {Object.entries(rd.tool_grades).map(([tool, g]: any) => (
                      <div key={tool} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{tool.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{g.current}</span>
                          <DeltaBadge delta={g.delta} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Strengths */}
              {rd.strengths?.length > 0 && (
                <Section title="Strengths" icon={<TrendingUp className="h-4 w-4 text-green-500" />}>
                  <ul className="space-y-1.5">
                    {rd.strengths.map((s: any, i: number) => (
                      <li key={i} className="text-sm flex items-center justify-between">
                        <span className="capitalize">{s.tool.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-xs">{s.grade}{s.delta != null ? ` (${s.delta >= 0 ? '+' : ''}${s.delta})` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Weaknesses */}
              {rd.weaknesses?.length > 0 && (
                <Section title="Limiters" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}>
                  <ul className="space-y-1.5">
                    {rd.weaknesses.map((w: any, i: number) => (
                      <li key={i} className="text-sm flex items-center justify-between">
                        <span>{w.area}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{w.classification}</Badge>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Coach-only Prescriptive Fixes */}
              {role === 'coach' && rd.prescriptive_fixes?.length > 0 && (
                <Section title="Prescriptive Fixes" icon={<Target className="h-4 w-4 text-primary" />}>
                  <div className="space-y-2">
                    {rd.prescriptive_fixes.map((f: any, i: number) => (
                      <div key={i} className="text-sm border rounded-md p-2 bg-muted/30">
                        <div className="font-medium mb-1">{f.issue}</div>
                        <div className="text-muted-foreground text-xs">Drill: {f.drill}</div>
                        <div className="text-muted-foreground text-xs">Cue: {f.cue}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Recent Sessions */}
              {rd.recent_sessions?.length > 0 && (
                <Section title="Recent Sessions" icon={<Activity className="h-4 w-4" />}>
                  <ul className="space-y-1 text-sm">
                    {rd.recent_sessions.slice(0, 8).map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {format(new Date(s.date), 'MMM d')} · {s.module ?? s.type}
                        </span>
                        {s.composite?.composite != null && (
                          <span className="font-mono text-xs">{Math.round(s.composite.composite)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
      {icon}
      {title}
    </h4>
    <Card>
      <CardContent className="p-3">{children}</CardContent>
    </Card>
  </div>
);

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="text-center p-2 rounded bg-muted/40">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

const DeltaBadge = ({ delta }: { delta: number | null }) => {
  if (delta == null) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (delta > 0) return <span className="text-xs text-green-500 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />+{delta}</span>;
  if (delta < 0) return <span className="text-xs text-red-500 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" />{delta}</span>;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};
