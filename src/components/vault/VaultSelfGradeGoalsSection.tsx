/**
 * Self-graded goals — athlete-only target grades, visually separated from the
 * official grade surfaces. Nothing here is shared with coaches, scouts or
 * followers; the row-level rules on `self_grade_goals` enforce that server-side.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, Target, EyeOff, CheckCircle2, RotateCcw } from 'lucide-react';
import { useSelfGradeGoals } from '@/hooks/useSelfGradeGoals';
import { getGradeLabel } from '@/lib/gradeLabel';

interface VaultSelfGradeGoalsSectionProps {
  /** Latest self-reported grade per metric, e.g. { hitting: 45, power: 50 }. */
  currentSelfGrades: Record<string, number | null>;
  /** Metric keys to offer, in display order. */
  metrics: readonly string[];
}

export function VaultSelfGradeGoalsSection({
  currentSelfGrades,
  metrics,
}: VaultSelfGradeGoalsSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { goals, history, loading, setGoal, clearGoal, syncCurrentGrades } = useSelfGradeGoals();
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingMetric, setSavingMetric] = useState<string | null>(null);

  const byMetric = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.metric, g])),
    [goals],
  );

  // Fold new self-grades into any active goal (marks reached, keeps current).
  useEffect(() => {
    void syncCurrentGrades(currentSelfGrades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(currentSelfGrades), goals.length]);

  const label = (metric: string) =>
    t(`vault.scoutGrades.categories.${metric}`, { defaultValue: metric.replace(/_/g, ' ') });

  const handleSave = async (metric: string) => {
    const current = currentSelfGrades[metric] ?? null;
    const target = drafts[metric] ?? byMetric[metric]?.goal_grade ?? (current ?? 50) + 5;
    setSavingMetric(metric);
    await setGoal(metric, Math.round(target), current);
    setSavingMetric(null);
  };

  return (
    <Card className="border-2 border-sky-500/25 bg-gradient-to-br from-sky-500/5 to-background">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-sky-500" />
                <CardTitle className="text-lg">My grade goals</CardTitle>
                {goals.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{goals.length}</Badge>
                )}
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <EyeOff className="h-3 w-3" /> Private
                </Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>
              Targets you set for yourself. Separate from official grades and never shown to
              coaches, scouts or followers.
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading your goals…</p>
            ) : (
              metrics.map((metric) => {
                const goal = byMetric[metric];
                const current = currentSelfGrades[metric] ?? goal?.current_self_grade ?? null;
                const target = drafts[metric] ?? goal?.goal_grade ?? (current ?? 50) + 5;
                const reached = goal?.reached_at != null;
                const pct =
                  goal && current != null
                    ? Math.max(0, Math.min(100, Math.round((current / goal.goal_grade) * 100)))
                    : 0;

                return (
                  <div key={metric} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm font-medium capitalize">{label(metric)}</Label>
                      <div className="flex items-center gap-2">
                        {current != null && (
                          <Badge variant="outline" className="text-[10px]">
                            Now {current} · {getGradeLabel(current)}
                          </Badge>
                        )}
                        {reached && (
                          <Badge className="gap-1 bg-green-600 text-[10px] hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Reached
                          </Badge>
                        )}
                        {goal && goal.reset_count > 0 && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <RotateCcw className="h-3 w-3" /> {goal.reset_count}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {goal && current != null && <Progress value={pct} className="h-1.5" />}

                    <div className="flex items-center gap-3">
                      <Slider
                        value={[target]}
                        min={20}
                        max={80}
                        step={1}
                        onValueChange={(v) => setDrafts((d) => ({ ...d, [metric]: v[0] }))}
                        className="flex-1"
                      />
                      <span className="w-20 text-right text-xs text-muted-foreground">
                        Goal {Math.round(target)}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2">
                      {goal && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => clearGoal(metric)}
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savingMetric === metric}
                        onClick={() => handleSave(metric)}
                      >
                        {goal ? 'Reset goal' : 'Set goal'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}

            {history.length > 0 && (
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Past goals
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {history.slice(0, 8).map((h) => (
                    <li key={h.id} className="flex justify-between gap-2">
                      <span className="capitalize">{label(h.metric)}</span>
                      <span>
                        goal {h.goal_grade}
                        {h.reached_at ? ' · reached' : ' · replaced'} ·{' '}
                        {new Date(h.set_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
