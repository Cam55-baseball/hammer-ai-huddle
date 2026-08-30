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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { useToast } from '@/hooks/use-toast';
import { getTodayDate } from '@/utils/dateUtils';
import { Switch } from '@/components/ui/switch';
import {
  positionPlayerGroups,
  pitchingGroups,
  POSITION_OPTIONS,
  SIDE_SPLIT_KEYS,
  BAT_SIDE_LABELS,
  deriveGradeType,
  blendSides,
  TOOL_LABELS,
  type BatSide,
  type ToolDef,
} from '@/lib/evaluation/scoutingTools';
import { ClipboardCheck, Loader2, ShieldAlert, ArrowLeft, Plus, Trash2 } from 'lucide-react';

const CONTEXT_OPTIONS = [
  'In-person — game',
  'In-person — workout/practice',
  'In-person — showcase/camp',
  'Video review',
];

const SCALE = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

interface PositionLookDraft {
  key: string;
  position: string;
  defense_grade: number | null;
  defense_grade_future: number | null;
  throwing_grade: number | null;
  throwing_grade_future: number | null;
}

const newLook = (): PositionLookDraft => ({
  key: Math.random().toString(36).slice(2),
  position: '',
  defense_grade: null,
  defense_grade_future: null,
  throwing_grade: null,
  throwing_grade_future: null,
});

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

  // Independent sections — a two-way player gets both on ONE report.
  const [includePosition, setIncludePosition] = useState(true);
  const [includePitching, setIncludePitching] = useState(false);

  const [looks, setLooks] = useState<PositionLookDraft[]>([newLook()]);
  const [isSwitchHitter, setIsSwitchHitter] = useState(false);
  const [sawBothSides, setSawBothSides] = useState(false);
  const [sideGrades, setSideGrades] = useState<Record<string, number | null>>({});

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
    (async () => {
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', athleteId).maybeSingle(),
        supabase.from('athlete_mpi_settings').select('sport').eq('user_id', athleteId).maybeSingle(),
      ]);
      setAthleteName((profile as { full_name?: string } | null)?.full_name ?? null);
      setSport((settings as { sport?: string } | null)?.sport ?? 'baseball');
    })();
  }, [athleteId]);

  const splitSides = isSwitchHitter && sawBothSides;

  /** Groups rendered as flat single-value tools. Defense moves to position looks;
   *  side-split offensive tools move to the per-side grid when both sides were seen. */
  const flatGroups = useMemo(() => {
    const out: { id: string; title: string; description: string; tools: ToolDef[] }[] = [];
    const seen = new Set<string>();
    const push = (groups: ReturnType<typeof positionPlayerGroups>, prefix: string) => {
      for (const g of groups) {
        if (g.id === 'defense') continue; // handled per position look
        const tools = g.tools.filter((t) => {
          if (splitSides && (SIDE_SPLIT_KEYS as readonly string[]).includes(t.key)) return false;
          if (seen.has(t.key)) return false;
          seen.add(t.key);
          return true;
        });
        if (tools.length === 0) continue;
        out.push({ id: `${prefix}-${g.id}`, title: g.title, description: g.description, tools });
      }
    };
    if (includePosition) push(positionPlayerGroups(), 'pos');
    if (includePitching) push(pitchingGroups(sport), 'pit');
    return out;
  }, [includePosition, includePitching, sport, splitSides]);

  const flatTools = useMemo(() => flatGroups.flatMap((g) => g.tools), [flatGroups]);
  const gradedCount = flatTools.filter((t) => current[t.key] != null || future[t.key] != null).length;

  const sideKey = (side: BatSide, key: string, fut: boolean) => `${side}:${key}${fut ? '_future' : ''}`;

  const setLook = (key: string, patch: Partial<PositionLookDraft>) =>
    setLooks((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const usedPositions = new Set(looks.map((l) => l.position).filter(Boolean));

  const canSubmit =
    !!athleteId && (includePosition || includePitching) && !saving;

  const handleSubmit = async () => {
    if (!user || !athleteId) return;
    if (!includePosition && !includePitching) {
      toast({ title: 'Add at least one section', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const gradeType = deriveGradeType({
        includesPositionTools: includePosition,
        includesPitchingTools: includePitching,
      });

      const filledLooks = includePosition
        ? looks.filter(
            (l) =>
              l.position &&
              (l.defense_grade != null ||
                l.defense_grade_future != null ||
                l.throwing_grade != null ||
                l.throwing_grade_future != null),
          )
        : [];
      const primary = filledLooks[0];

      const row: Record<string, unknown> = {
        user_id: athleteId,
        evaluator_id: user.id,
        grade_source: 'coach_evaluated',
        grade_type: gradeType,
        includes_position_tools: includePosition,
        includes_pitching_tools: includePitching,
        graded_at: new Date(`${evaluationDate}T12:00:00`).toISOString(),
        evaluation_context: contextType,
        event_description: contextDetail.trim() || null,
        overall_grade: overallGrade,
        notes: notes.trim() || null,
        player_confirmed: false,
        // Legacy single-look mirror: the primary position on this report, so
        // every existing reader keeps working unchanged.
        position_evaluated: primary?.position ?? null,
        defense_grade: primary?.defense_grade ?? null,
        defense_grade_future: primary?.defense_grade_future ?? null,
        throwing_grade: primary?.throwing_grade ?? null,
        throwing_grade_future: primary?.throwing_grade_future ?? null,
        is_switch_hitter: includePosition ? isSwitchHitter : null,
        saw_both_batting_sides: includePosition && isSwitchHitter ? sawBothSides : null,
      };

      for (const t of flatTools) {
        row[t.key] = current[t.key] ?? null;
        row[`${t.key}_future`] = future[t.key] ?? null;
      }

      // Side-split tools: the parent row carries the blend so single-number
      // readers stay honest; the per-side truth lives in the child rows.
      if (splitSides) {
        for (const key of SIDE_SPLIT_KEYS) {
          row[key] = blendSides(sideGrades[sideKey('R', key, false)] ?? null, sideGrades[sideKey('L', key, false)] ?? null);
          row[`${key}_future`] = blendSides(
            sideGrades[sideKey('R', key, true)] ?? null,
            sideGrades[sideKey('L', key, true)] ?? null,
          );
        }
      }

      const { data: inserted, error } = await supabase
        .from('vault_scout_grades')
        .insert(row as never)
        .select('id')
        .single();
      if (error) throw error;
      const gradeId = (inserted as { id: string }).id;

      if (filledLooks.length > 0) {
        const { error: posErr } = await supabase.from('vault_scout_grade_positions').insert(
          filledLooks.map((l) => ({
            grade_id: gradeId,
            position: l.position,
            defense_grade: l.defense_grade,
            defense_grade_future: l.defense_grade_future,
            throwing_grade: l.throwing_grade,
            throwing_grade_future: l.throwing_grade_future,
          })) as never,
        );
        if (posErr) throw posErr;
      }

      if (splitSides) {
        const sideRows = (['R', 'L'] as BatSide[])
          .map((side) => ({
            grade_id: gradeId,
            bat_side: side,
            hitting_grade: sideGrades[sideKey(side, 'hitting_grade', false)] ?? null,
            hitting_grade_future: sideGrades[sideKey(side, 'hitting_grade', true)] ?? null,
            power_grade: sideGrades[sideKey(side, 'power_grade', false)] ?? null,
            power_grade_future: sideGrades[sideKey(side, 'power_grade', true)] ?? null,
            plate_discipline_grade: sideGrades[sideKey(side, 'plate_discipline_grade', false)] ?? null,
            plate_discipline_grade_future:
              sideGrades[sideKey(side, 'plate_discipline_grade', true)] ?? null,
          }))
          .filter((r) =>
            Object.entries(r).some(([k, v]) => k !== 'grade_id' && k !== 'bat_side' && v != null),
          );
        if (sideRows.length > 0) {
          const { error: sideErr } = await supabase
            .from('vault_scout_grade_bat_sides')
            .insert(sideRows as never);
          if (sideErr) throw sideErr;
        }
      }

      toast({
        title: 'Evaluation filed — awaiting player confirmation',
        description: `${athleteName ?? 'The athlete'} must confirm they attended this event before the report becomes visible to them or to anyone following them.`,
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
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Scouting Report
            </h1>
            <p className="text-sm text-muted-foreground">
              {athleteName ? `Evaluation of ${athleteName}` : 'Evaluation'} · 20–80 scale
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/evaluations')}>
            My reports
          </Button>
        </div>

        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <p className="font-medium">Player confirmation required</p>
          <p className="text-muted-foreground">
            After you file this, only you can see it until the player confirms they were present at
            this event. Once confirmed, it opens up to the player and their accepted coaches and
            scouts.
          </p>
        </div>

        {/* 1. Header */}
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
              <p className="text-sm text-destructive">
                No athlete selected. Open this report from a player card on your dashboard.
              </p>
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
          </CardContent>
        </Card>

        {/* 2. What this report covers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What did you see?</CardTitle>
            <CardDescription>
              One event, one report. A two-way player can carry both sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <Switch
                checked={includePosition}
                onCheckedChange={setIncludePosition}
                aria-label="Include position-player tools"
              />
              <span className="text-sm">
                <span className="font-medium block">Position-player tools</span>
                <span className="text-muted-foreground">
                  Hit, power, run, defense and arm at every position you saw.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <Switch
                checked={includePitching}
                onCheckedChange={setIncludePitching}
                aria-label="Include pitching tools"
              />
              <span className="text-sm">
                <span className="font-medium block">Pitching tools</span>
                <span className="text-muted-foreground">
                  Arsenal, command, delivery and pitching craft.
                </span>
              </span>
            </label>
            {!includePosition && !includePitching && (
              <p className="text-sm text-destructive">Turn on at least one section to file a report.</p>
            )}
          </CardContent>
        </Card>

        {/* 3. Position looks */}
        {includePosition && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Positions seen</CardTitle>
              <CardDescription>
                Defense and Arm are graded at each position separately — a look at short is not a
                look in right field. Add a row for every position you saw at this event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {looks.map((look, idx) => (
                <div key={look.key} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={look.position}
                      onValueChange={(v) => setLook(look.key, { position: v })}
                    >
                      <SelectTrigger className="h-9 w-40" aria-label={`Position ${idx + 1}`}>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {POSITION_OPTIONS.filter(
                          (p) => p === look.position || !usedPositions.has(p),
                        ).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    {looks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove this position look"
                        onClick={() => setLooks((prev) => prev.filter((l) => l.key !== look.key))}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_84px_84px] gap-3 text-xs font-medium text-muted-foreground">
                    <span>Tool</span>
                    <span className="text-center">Present</span>
                    <span className="text-center">Future</span>
                  </div>
                  {(
                    [
                      ['defense_grade', 'Defense'],
                      ['throwing_grade', 'Arm'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="grid grid-cols-[1fr_84px_84px] gap-3 items-center">
                      <span className="text-sm">
                        {label}
                        {look.position ? ` @ ${look.position}` : ''}
                      </span>
                      <GradeSelect
                        ariaLabel={`${label} present`}
                        value={look[key]}
                        onChange={(v) => setLook(look.key, { [key]: v } as Partial<PositionLookDraft>)}
                      />
                      <GradeSelect
                        ariaLabel={`${label} future`}
                        value={look[`${key}_future` as const]}
                        onChange={(v) =>
                          setLook(look.key, { [`${key}_future`]: v } as Partial<PositionLookDraft>)
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLooks((prev) => [...prev, newLook()])}
                disabled={usedPositions.size >= POSITION_OPTIONS.length}
              >
                <Plus className="h-4 w-4 mr-2" /> Add another position
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 4. Switch hitting */}
        {includePosition && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Batting side</CardTitle>
              <CardDescription>
                A switch hitter is two hitters. Grade each side only if you actually saw it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={isSwitchHitter}
                  onCheckedChange={(v) => {
                    setIsSwitchHitter(v);
                    if (!v) setSawBothSides(false);
                  }}
                  aria-label="Switch hitter"
                />
                <span className="text-sm">{isSwitchHitter ? 'Switch hitter' : 'Hits one side'}</span>
              </div>

              {isSwitchHitter && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={sawBothSides}
                    onCheckedChange={setSawBothSides}
                    aria-label="Saw both sides"
                  />
                  <span className="text-sm">
                    {sawBothSides
                      ? 'Saw both sides — grading them separately'
                      : 'Only saw one side at this event'}
                  </span>
                </div>
              )}

              {splitSides && (
                <div className="space-y-3">
                  <Separator />
                  <div className="grid grid-cols-[1fr_repeat(4,64px)] gap-2 text-[11px] font-medium text-muted-foreground">
                    <span>Tool</span>
                    <span className="text-center">R now</span>
                    <span className="text-center">R fut</span>
                    <span className="text-center">L now</span>
                    <span className="text-center">L fut</span>
                  </div>
                  {SIDE_SPLIT_KEYS.map((key) => (
                    <div key={key} className="grid grid-cols-[1fr_repeat(4,64px)] gap-2 items-center">
                      <span className="text-sm truncate">{TOOL_LABELS[key]}</span>
                      {(['R', 'L'] as BatSide[]).flatMap((side) =>
                        [false, true].map((fut) => {
                          const k = sideKey(side, key, fut);
                          return (
                            <GradeSelect
                              key={k}
                              ariaLabel={`${TOOL_LABELS[key]} ${BAT_SIDE_LABELS[side]} ${fut ? 'future' : 'present'}`}
                              value={sideGrades[k] ?? null}
                              onChange={(v) => setSideGrades((p) => ({ ...p, [k]: v }))}
                            />
                          );
                        }),
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    The report also stores the blend of the two sides so single-number readers stay
                    accurate — the per-side grades remain the truth.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5. Remaining tool grades */}
        {flatGroups.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tool grades</CardTitle>
              <CardDescription>
                Present grade and projected (future) grade for each tool. {gradedCount}/
                {flatTools.length} graded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {flatGroups.map((group) => (
                <section key={group.id} className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold">{group.title}</h2>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_84px_84px] gap-3 text-xs font-medium text-muted-foreground">
                    <span>Tool</span>
                    <span className="text-center">Present</span>
                    <span className="text-center">Future</span>
                  </div>
                  {group.tools.map((t) => (
                    <div key={t.key} className="grid grid-cols-[1fr_84px_84px] gap-3 items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.hint}</p>
                      </div>
                      <GradeSelect
                        ariaLabel={`${t.label} present`}
                        value={current[t.key] ?? null}
                        onChange={(v) => setCurrent((p) => ({ ...p, [t.key]: v }))}
                      />
                      <GradeSelect
                        ariaLabel={`${t.label} future`}
                        value={future[t.key] ?? null}
                        onChange={(v) => setFuture((p) => ({ ...p, [t.key]: v }))}
                      />
                    </div>
                  ))}
                </section>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 6. Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall & write-up</CardTitle>
            <CardDescription>OFP and what the numbers don't say.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 max-w-[140px]">
              <Label className="text-xs">Overall (OFP)</Label>
              <GradeSelect ariaLabel="Overall grade" value={overallGrade} onChange={setOverallGrade} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Write-up</Label>
              <Textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What stood out, what needs work, what you'd want to see next."
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full" size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ClipboardCheck className="h-4 w-4 mr-2" />
          )}
          File scouting report
        </Button>
      </div>
    </DashboardLayout>
  );
}
