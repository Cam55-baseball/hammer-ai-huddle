import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useFiledEvaluations, useProfileNames, type EvaluationRow } from '@/hooks/useEvaluations';
import { subjectKey, subjectLabel } from '@/lib/evaluation/reportSubject';
import { TOOL_DISPLAY_ORDER, TOOL_LABELS } from '@/lib/evaluation/scoutingTools';
import { exportComparisonPdf, type ComparisonColumn } from '@/lib/evaluation/reportPdf';
import { ArrowLeft, Download, Loader2, Users } from 'lucide-react';

/**
 * Side-by-side comparison of players the signed-in evaluator has reported on.
 *
 * A player's column is their MOST RECENT recorded grade per tool across their
 * reports — never an average, so a stale look can't dilute a fresh one. Tools
 * nobody was graded on are dropped from the table entirely.
 */

interface Subject {
  key: string;
  label: string;
  reports: EvaluationRow[];
}

function latestGrades(reports: EvaluationRow[]): Record<string, number | null> {
  const ordered = [...reports].sort(
    (a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime(),
  );
  const out: Record<string, number | null> = {};
  for (const key of TOOL_DISPLAY_ORDER) {
    for (const r of ordered) {
      const v = (r[key] as number | null) ?? null;
      if (v != null) {
        out[key] = v;
        break;
      }
    }
  }
  return out;
}

function gradeTone(n: number | null | undefined): string {
  if (n == null) return 'text-muted-foreground';
  if (n >= 65) return 'text-emerald-500';
  if (n >= 55) return 'text-sky-500';
  if (n >= 45) return 'text-foreground';
  if (n >= 35) return 'text-amber-500';
  return 'text-destructive';
}

export default function PlayerComparison() {
  const navigate = useNavigate();
  const { data: filed = [], isLoading } = useFiledEvaluations();
  const athleteIds = useMemo(
    () => filed.map((r) => r.user_id).filter(Boolean) as string[],
    [filed],
  );
  const { data: names = {} } = useProfileNames(athleteIds);

  const subjects: Subject[] = useMemo(() => {
    const bucket = new Map<string, Subject>();
    for (const r of filed) {
      const key = subjectKey(r);
      const existing = bucket.get(key);
      if (existing) existing.reports.push(r);
      else bucket.set(key, { key, label: subjectLabel(r, names), reports: [r] });
    }
    return [...bucket.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filed, names]);

  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const columns: ComparisonColumn[] = useMemo(
    () =>
      selected
        .map((key) => subjects.find((s) => s.key === key))
        .filter(Boolean)
        .map((s) => {
          const subject = s as Subject;
          const ordered = [...subject.reports].sort(
            (a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime(),
          );
          const overall = ordered.find((r) => r.overall_grade != null)?.overall_grade ?? null;
          return {
            subject: subject.label,
            grades: latestGrades(subject.reports),
            overall,
            reportCount: subject.reports.length,
            latestAt: ordered[0]?.graded_at ?? null,
          };
        }),
    [selected, subjects],
  );

  const visibleTools = useMemo(
    () => TOOL_DISPLAY_ORDER.filter((key) => columns.some((c) => c.grades[key] != null)),
    [columns],
  );

  const ready = columns.length >= 2;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4 pb-16">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Compare players
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick two or more players you've evaluated to see their grades side by side.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Players you've reported on</CardTitle>
            <CardDescription>
              Includes unlinked prospects. Each column shows the most recent grade recorded per tool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your reports…
              </p>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven't filed any reports yet, so there is nothing to compare.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {subjects.map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center gap-3 rounded-md border p-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(s.key)}
                      onCheckedChange={() => toggle(s.key)}
                      aria-label={`Compare ${s.label}`}
                    />
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    <Badge variant="outline">
                      {s.reports.length} report{s.reports.length === 1 ? '' : 's'}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selected.length === 1 && (
          <p className="text-sm text-muted-foreground">Pick at least one more player to compare.</p>
        )}

        {ready && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Side by side</CardTitle>
                  <CardDescription>20–80 scale. Blank means never graded on that tool.</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportComparisonPdf(columns, visibleTools)}
                >
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Tool</th>
                    {columns.map((c) => (
                      <th key={c.subject} className="py-2 px-2 text-center font-medium">
                        {c.subject}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-semibold">OFP</td>
                    {columns.map((c) => (
                      <td
                        key={c.subject}
                        className={`py-2 px-2 text-center font-bold ${gradeTone(c.overall)}`}
                      >
                        {c.overall ?? '—'}
                      </td>
                    ))}
                  </tr>
                  {visibleTools.map((key) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-1.5 pr-2">{TOOL_LABELS[key] ?? key}</td>
                      {columns.map((c) => (
                        <td
                          key={c.subject}
                          className={`py-1.5 px-2 text-center font-semibold ${gradeTone(c.grades[key])}`}
                        >
                          {c.grades[key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleTools.length === 0 && (
                <p className="text-sm text-muted-foreground py-3">
                  These reports carry no tool grades to compare.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
