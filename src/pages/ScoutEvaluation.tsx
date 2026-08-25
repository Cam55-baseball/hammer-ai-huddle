import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { useToast } from '@/hooks/use-toast';
import { getTodayDate } from '@/utils/dateUtils';
import { ClipboardCheck, Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';

type GradeType = 'hitting_throwing' | 'pitching';

interface ToolDef {
  key: string;
  label: string;
  hint: string;
}

const POSITION_TOOLS: ToolDef[] = [
  { key: 'hitting_grade', label: 'Hit', hint: 'Bat-to-ball, approach, contact quality' },
  { key: 'power_grade', label: 'Power', hint: 'Raw and game power' },
  { key: 'speed_grade', label: 'Run', hint: 'Home-to-first, underway speed' },
  { key: 'defense_grade', label: 'Field', hint: 'Actions, hands, footwork, instincts' },
  { key: 'throwing_grade', label: 'Arm', hint: 'Arm strength, carry, accuracy' },
  { key: 'self_efficacy_grade', label: 'Competitiveness', hint: 'Self-belief, response to failure' },
  { key: 'leadership_grade', label: 'Leadership', hint: 'Presence, dugout/field impact' },
];

const PITCHING_TOOLS: ToolDef[] = [
  { key: 'fastball_grade', label: 'Fastball', hint: 'Velocity, life, plane' },
  { key: 'offspeed_grade', label: 'Offspeed', hint: 'Changeup / drop-change separation' },
  { key: 'breaking_ball_grade', label: 'Breaking Ball', hint: 'Shape, tilt, sharpness' },
  { key: 'control_grade', label: 'Control / Command', hint: 'Strikes and location within zone' },
  { key: 'delivery_grade', label: 'Delivery', hint: 'Repeatability, athleticism, arm action' },
  { key: 'self_efficacy_grade', label: 'Competitiveness', hint: 'Mound presence under stress' },
  { key: 'leadership_grade', label: 'Leadership', hint: 'Staff and clubhouse impact' },
];

const RISE_BALL_TOOL: ToolDef = { key: 'rise_ball_grade', label: 'Rise Ball', hint: 'Late lift, spin quality (softball)' };

const CONTEXT_OPTIONS = [
  'In-person — game',
  'In-person — workout/practice',
  'In-person — showcase/camp',
  'Video review',
];

const SCALE = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

function GradeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  ariaLabel: string;
}) {
  return (
    <Select
      value={value == null ? '' : String(value)}
      onValueChange={(v) => onChange(v === '' ? null : Number(v))}
    >
      <SelectTrigger className="h-9" aria-label={ariaLabel}>
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {SCALE.map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ScoutEvaluation() {
  const { athleteId: paramAthleteId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canSendActivities, isScout, isCoach, loading: accessLoading } = useScoutAccess();
  const { toast } = useToast();

  const athleteId = paramAthleteId ?? searchParams.get('athleteId') ?? '';

  const [athleteName, setAthleteName] = useState<string | null>(null);
  const [sport, setSport] = useState<string>('baseball');
  const [gradeType, setGradeType] = useState<GradeType>('hitting_throwing');
  const [contextType, setContextType] = useState<string>(CONTEXT_OPTIONS[0]);
  const [contextDetail, setContextDetail] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(getTodayDate());
  const [current, setCurrent] = useState<Record<string, number | null>>({});
  const [future, setFuture] = useState<Record<string, number | null>>({});
  const [overallGrade, setOverallGrade] = useState<number | null>(50);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', athleteId).maybeSingle(),
        supabase.from('athlete_mpi_settings').select('sport').eq('user_id', athleteId).maybeSingle(),
      ]);
      if (cancelled) return;
      setAthleteName((profile as { full_name?: string } | null)?.full_name ?? null);
      setSport((settings as { sport?: string } | null)?.sport ?? 'baseball');
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const tools = useMemo(() => {
    if (gradeType === 'pitching') {
      return sport === 'softball' ? [...PITCHING_TOOLS.slice(0, 3), RISE_BALL_TOOL, ...PITCHING_TOOLS.slice(3)] : PITCHING_TOOLS;
    }
    return POSITION_TOOLS;
  }, [gradeType, sport]);

  const gradedCount = tools.filter((t) => current[t.key] != null || future[t.key] != null).length;

  const handleSubmit = async () => {
    if (!user || !athleteId) return;
    setSaving(true);
    try {
      const row: Record<string, unknown> = {
        user_id: athleteId,
        evaluator_id: user.id,
        grade_source: 'coach_evaluated',
        grade_type: gradeType,
        graded_at: new Date(`${evaluationDate}T12:00:00`).toISOString(),
        evaluation_context: [contextType, contextDetail.trim()].filter(Boolean).join(' — '),
        overall_grade: overallGrade,
        notes: notes.trim() || null,
      };
      for (const t of tools) {
        row[t.key] = current[t.key] ?? null;
        row[`${t.key}_future`] = future[t.key] ?? null;
      }

      const { error } = await supabase.from('vault_scout_grades').insert(row as never);
      if (error) throw error;

      toast({
        title: 'Evaluation filed',
        description: `Scouting report saved for ${athleteName ?? 'this athlete'}.`,
      });
      navigate('/scout-dashboard');
    } catch (err) {
      toast({
        title: 'Could not file evaluation',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || accessLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !canSendActivities) {
    return (
      <DashboardLayout>
        <Card className="max-w-lg mx-auto mt-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Evaluator access required
            </CardTitle>
            <CardDescription>
              Filing a scouting report requires an active scout or coach role on this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go back
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-16">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Scouting Report
            </h1>
            <p className="text-sm text-muted-foreground">
              {athleteName ? `Evaluation of ${athleteName}` : 'Evaluation'} · 20–80 scale
            </p>
          </div>
        </div>

        {/* 1. Evaluator & context */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report header</CardTitle>
            <CardDescription>Who filed it, when, and how the player was seen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{isScout ? 'Scout' : isCoach ? 'Coach' : 'Evaluator'}</Badge>
              <Badge variant="outline">{sport === 'softball' ? 'Softball' : 'Baseball'}</Badge>
            </div>

            {!athleteId && (
              <div className="space-y-1">
                <Label className="text-xs">Athlete</Label>
                <p className="text-sm text-destructive">
                  No athlete selected. Open this report from a player card on your dashboard.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Evaluation date</Label>
                <Input
                  type="date"
                  value={evaluationDate}
                  onChange={(e) => setEvaluationDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Look type</Label>
                <Select value={contextType} onValueChange={setContextType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {CONTEXT_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Event / setting (optional)</Label>
              <Input
                placeholder="e.g. vs. Central High, playoffs"
                value={contextDetail}
                onChange={(e) => setContextDetail(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Report type</Label>
              <Tabs value={gradeType} onValueChange={(v) => setGradeType(v as GradeType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="hitting_throwing">Position player</TabsTrigger>
                  <TabsTrigger value="pitching">Pitcher</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* 2. Tool grades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tool grades</CardTitle>
            <CardDescription>
              Present grade and projected (future) grade for each tool. {gradedCount}/{tools.length} graded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_84px_84px] gap-3 text-xs font-medium text-muted-foreground">
              <span>Tool</span>
              <span className="text-center">Present</span>
              <span className="text-center">Future</span>
            </div>
            <Separator />
            {tools.map((tool) => (
              <div key={tool.key} className="grid grid-cols-[1fr_84px_84px] gap-3 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tool.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{tool.hint}</p>
                </div>
                <GradeSelect
                  value={current[tool.key] ?? null}
                  onChange={(v) => setCurrent((c) => ({ ...c, [tool.key]: v }))}
                  ariaLabel={`${tool.label} present grade`}
                />
                <GradeSelect
                  value={future[tool.key] ?? null}
                  onChange={(v) => setFuture((f) => ({ ...f, [tool.key]: v }))}
                  ariaLabel={`${tool.label} future grade`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 3. Overall */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall future value</CardTitle>
            <CardDescription>Your bottom-line summary grade, independent of the tool breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-[160px]">
            <GradeSelect value={overallGrade} onChange={setOverallGrade} ariaLabel="Overall grade" />
          </CardContent>
        </Card>

        {/* 4. Write-up */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Write-up</CardTitle>
            <CardDescription>Body, actions, makeup, projection, and next look.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={6}
              placeholder="Free-and-easy arm action, stays through the ball to the middle..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={saving || !athleteId}
          className="w-full"
          size="lg"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
          File scouting report
        </Button>
      </div>
    </DashboardLayout>
  );
}
