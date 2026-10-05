import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useVaultQuizzesForDate } from '@/hooks/useVaultQuizzesForDate';
import { useHammerState } from '@/hooks/useHammerState';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { useReadinessState } from '@/hooks/useReadinessState';
import { useTexVisionS2Priority } from '@/components/hammer/TexVisionS2Priority';

/**
 * Performance context — real evidence only (owner ruling 2026-10-05).
 * Lists each recorded signal with its date, or says plainly that it is
 * missing. No season baseline score, no questionnaire narrative, no
 * estimates, no gap-filling. Lives on The General as its own section.
 */
export function HumanPerformanceCard() {
  const checkins = useVaultQuizzesForDate();
  const hammer = useHammerState();
  const hie = useHIESnapshot();
  const readiness = useReadinessState();
  const vision = useTexVisionS2Priority();
  const morning = checkins.quizzes.find(q => q.quiz_type === 'morning');
  const fresh = (iso?: string | null) => !!iso && Date.now() - new Date(iso).getTime() < 48 * 3600_000;
  const workload = hammer.snapshot && fresh(hammer.snapshot.computed_at) ? hammer.snapshot : null;
  const analysis = hie.snapshot && fresh(hie.snapshot.computed_at) ? hie.snapshot : null;
  const day = (iso: string) => new Date(iso).toLocaleDateString();
  const rows: { label: string; value: string | null }[] = [
    { label: "Morning check-in", value: morning ? `Recorded ${morning.entry_date}` : null },
    { label: "Workload and recovery", value: workload ? `${workload.overall_state} · ${day(workload.computed_at)}` : null },
    { label: "Video analysis", value: analysis?.primary_limiter ? `${analysis.primary_limiter} · ${day(analysis.computed_at)}` : null },
    { label: "Readiness", value: readiness.hasSignal ? String(readiness.state) : null },
    ...(vision.hasAccess ? [{ label: "Vision test", value: vision.baseline ? `Recorded ${vision.baseline.test_date}` : null }] : []),
  ];
  return (
    <Card className="border-border/60" data-testid="performance-context">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" aria-hidden />
          Performance context
        </CardTitle>
        <p className="text-xs text-muted-foreground">Only what you have actually recorded. Missing means nothing has come in yet.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="divide-y divide-border/60">
          {rows.map(r => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className={r.value ? "text-right font-medium text-foreground" : "text-right text-muted-foreground"}>{r.value ?? "Missing"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Hammer's plan decides what changes today. This list explains; it never adds work or diagnoses anything.</p>
      </CardContent>
    </Card>
  );
}
