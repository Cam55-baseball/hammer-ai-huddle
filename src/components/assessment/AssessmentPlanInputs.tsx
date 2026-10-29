import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { persistContextAnswer } from '@/lib/hammer/context/acquisition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CompetitionLevelPicker } from '@/components/shared/CompetitionLevelPicker';
import { PhysioHealthIntakeDialog } from '@/components/physio/PhysioHealthIntakeDialog';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import type { RegisterDraftFlush } from '@/lib/assessment/draftFlush';
import { enteredNutritionGoals, NUTRITION_FIELDS, EXTRA_NUTRITION_FIELDS } from '@/lib/assessment/planInputReview';
import { Checkbox } from '@/components/ui/checkbox';

const DATE_FIELDS = [['preseason_start_date', 'Pre-season starts'], ['preseason_end_date', 'Pre-season ends'], ['in_season_start_date', 'Season starts'], ['in_season_end_date', 'Season ends'], ['post_season_start_date', 'Post-season starts'], ['post_season_end_date', 'Post-season ends']] as const;

/** Save to the same context, nutrition and health records used outside assessment. */
export function AssessmentPlanInputs({ registerFlush, onBack }: { registerFlush?: RegisterDraftFlush; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const physio = usePhysioProfile();
  const [healthOpen, setHealthOpen] = useState(false);
  const [datesUnknown, setDatesUnknown] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [supplements, setSupplements] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['assessment-plan-inputs', user?.id], enabled: !!user, queryFn: async () => {
    if (!user) throw new Error('Sign in first');
    const [context, nutrition, season, assessment] = await Promise.all([
      supabase.from('athlete_context').select('sport_primary,position_primary,position_secondary,competition_level,bats_hand,throws_hand,weekly_availability_days,sleep_target_hrs,lifting_age_years,goal_horizon,weekly_availability_hours,typical_session_length_min,years_in_sport').eq('user_id', user.id).maybeSingle(),
      supabase.from('vault_nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('athlete_mpi_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('initial_assessments').select('initial_input_answers').eq('user_id', user.id).maybeSingle(),
    ]);
    for (const result of [context, nutrition, season, assessment]) if (result.error) throw result.error;
    return { context: context.data, nutrition: nutrition.data, season: season.data, assessment: assessment.data };
  } });
  useEffect(() => {
    if (!query.data) return;
    const context = query.data.context ?? {};
    const nutrition = query.data.nutrition ?? {};
    setValues({ ...Object.fromEntries(Object.entries({ ...context, ...nutrition, ...query.data.season }).filter(([, value]) => value != null && !Array.isArray(value)).map(([key, value]) => [key, String(value)])), position_secondary: context.position_secondary?.join(', ') ?? '' });
    const review = query.data.assessment?.initial_input_answers as Record<string, unknown> | null;
    setDatesUnknown(review?.season_dates_unknown === true);
    const savedSupplements = query.data.nutrition?.supplement_goals;
    setSupplements(Array.isArray(savedSupplements) ? savedSupplements.filter((item): item is string => typeof item === 'string').join(', ') : '');
  }, [query.data]);
  const save = async () => {
    if (!user || !query.isSuccess || saving || healthOpen) return false;
    setSaving(true); setError(null);
    try {
      const nutrition = enteredNutritionGoals(values, supplements);
      const numberKeys = ['weekly_availability_days', 'sleep_target_hrs', 'lifting_age_years', 'weekly_availability_hours', 'typical_session_length_min', 'years_in_sport'];
      for (const key of numberKeys) {
        if (!values[key]?.trim()) continue;
        const n = Number(values[key]);
        if (!Number.isFinite(n) || n < 0 || (key === 'weekly_availability_days' && (!Number.isInteger(n) || n < 1 || n > 7)) || (key === 'sleep_target_hrs' && (n <= 0 || n > 24))) throw new Error('Check your training days, sleep hours and lifting years.');
      }
      const expected: Record<string, unknown> = {};
      for (const key of ['position_primary', 'competition_level', 'bats_hand', 'throws_hand', 'goal_horizon', ...numberKeys]) {
        if (!values[key]?.trim()) continue;
        expected[key] = numberKeys.includes(key) ? Number(values[key]) : values[key].trim();
        await persistContextAnswer(user.id, key, expected[key], 'initial_assessment.profile');
      }
      expected.position_secondary = values.position_secondary?.split(',').map(v => v.trim()).filter(Boolean) ?? [];
      await persistContextAnswer(user.id, 'position_secondary', expected.position_secondary, 'initial_assessment.profile');
      const readback = await supabase.from('athlete_context').select('*').eq('user_id', user.id).single();
      if (readback.error || Object.entries(expected).some(([key, value]) => JSON.stringify((readback.data as Record<string, unknown> | null)?.[key]) !== JSON.stringify(value))) throw new Error('Your training answers were not confirmed. Try again.');
      if (nutrition) {
        const result = await supabase.from('vault_nutrition_goals').upsert({ user_id: user.id, ...nutrition, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('*').single();
        if (result.error || !result.data || Object.entries(nutrition).some(([key, value]) => JSON.stringify((result.data as Record<string, unknown>)[key]) !== JSON.stringify(value))) throw result.error ?? new Error('Nutrition save was not confirmed.');
      }
      const dates = Object.fromEntries(DATE_FIELDS.map(([key]) => [key, values[key] || null]));
      for (let i = 0; i < DATE_FIELDS.length; i += 2) {
        const start = dates[DATE_FIELDS[i][0]], end = dates[DATE_FIELDS[i + 1][0]];
        if ((start && !end) || (!start && end) || (start && end && end < start)) throw new Error('Enter both dates for each known phase, with the end after the start.');
      }
      if (!datesUnknown && !Object.values(dates).some(Boolean)) throw new Error('Enter your season dates, or choose not known yet.');
      if (!values.season_status) throw new Error('Choose your season phase.');
      if (!query.data.context?.sport_primary) throw new Error('Choose your sport first.');
      const season = await supabase.from('athlete_mpi_settings').upsert({ user_id: user.id, sport: query.data.context.sport_primary, ...dates, season_status: values.season_status, season_status_manual: true, season_status_manual_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('*').single();
      if (season.error || !season.data || season.data.season_status !== values.season_status || Object.entries(dates).some(([key, value]) => (season.data as Record<string, unknown>)[key] !== value)) throw season.error ?? new Error('Season save was not confirmed.');
      await persistContextAnswer(user.id, 'season_phase', ({ off_season: 'off', preseason: 'pre', in_season: 'in', post_season: 'post' } as Record<string, string>)[values.season_status], 'initial_assessment.profile');
      const prior = query.data.assessment?.initial_input_answers as Record<string, unknown> | null;
      const review = await supabase.from('initial_assessments').upsert({ user_id: user.id, initial_input_answers: { ...prior, season_dates_reviewed: true, season_dates_unknown: datesUnknown, reviewed_at: new Date().toISOString() } }).select('initial_input_answers').single();
      if (review.error || !review.data) throw review.error ?? new Error('Date review was not saved.');
      await qc.invalidateQueries({ queryKey: ['start-readiness', user.id] });
      await qc.invalidateQueries({ queryKey: ['season-status', user.id] });
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save your answers. Try again."); return false; }
    finally { setSaving(false); }
  };
  useEffect(() => { registerFlush?.(save); return () => registerFlush?.(null); }, [registerFlush, user?.id, query.isSuccess, values, supplements, saving, healthOpen, datesUnknown]);
  const set = (key: string, value: string) => setValues(prior => ({ ...prior, [key]: value }));
  if (query.isError) return <p role="alert">Couldn't load your plan answers. Try again.</p>;
  if (!query.isSuccess) return <p role="status">Loading your answers…</p>;
  return <section className="min-w-0 space-y-5">
    <h3 className="text-lg font-semibold">Training, nutrition & health</h3>
    {([['position_primary', 'Main position'], ['position_secondary', 'Other positions (comma-separated, optional)'], ['goal_horizon', 'When you want to reach your goals (optional)']] as const).map(([key, label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label}</Label><Input id={`assessment-${key}`} value={values[key] ?? ''} onChange={e => set(key, e.target.value)} /></div>)}
    <CompetitionLevelPicker sport={query.data.context?.sport_primary === 'softball' ? 'softball' : 'baseball'} value={values.competition_level ?? ''} onChange={value => set('competition_level', typeof value === 'string' ? value : value.level)} />
    <div className="grid gap-3 sm:grid-cols-2">{[['bats_hand', 'Bats'], ['throws_hand', 'Throws']].map(([key, label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label}</Label><select id={`assessment-${key}`} className="h-10 w-full rounded-md border border-input bg-background" value={values[key] ?? ''} onChange={e => set(key, e.target.value)}><option value="">Choose</option><option value="R">Right</option><option value="L">Left</option><option value="S">Both</option></select></div>)}</div>
    {([['weekly_availability_days', 'Days available each week'], ['sleep_target_hrs', 'Usual sleep (hours a night)'], ['lifting_age_years', 'Years of lifting (0 if never)']] as const).map(([key, label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label}</Label><Input id={`assessment-${key}`} type="number" min="0" step="any" value={values[key] ?? ''} onChange={e => set(key, e.target.value)} /></div>)}
    {([['weekly_availability_hours', 'Available training hours each week (optional)'], ['typical_session_length_min', 'Usual session length (minutes, optional)'], ['years_in_sport', 'Years playing your sport (optional)']] as const).map(([key, label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label}</Label><Input id={`assessment-${key}`} type="number" min="0" value={values[key] ?? ''} onChange={e => set(key, e.target.value)} /></div>)}
    <Label htmlFor="assessment-season_status">Season phase</Label><select id="assessment-season_status" className="h-10 w-full rounded-md border border-input bg-background" value={values.season_status ?? ''} onChange={e => set('season_status', e.target.value)}><option value="">Choose</option>{[['off_season', 'Off-season'], ['preseason', 'Pre-season'], ['in_season', 'In-season'], ['post_season', 'Post-season']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select>
    <fieldset className="space-y-3"><legend className="font-semibold">Season dates</legend>{DATE_FIELDS.map(([key,label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label}</Label><Input id={`assessment-${key}`} type="date" value={values[key] ?? ''} onChange={e => set(key,e.target.value)} /></div>)}<label className="flex items-center gap-3"><Checkbox checked={datesUnknown} onCheckedChange={v => setDatesUnknown(v === true)} />Dates not known yet</label></fieldset>
    <fieldset className="space-y-3 border-t border-border pt-4"><legend className="text-sm font-semibold">Your nutrition targets</legend>
      <p className="text-xs text-muted-foreground">Enter targets you already use. If you're under 18, choose these with a parent or qualified professional; no weight-loss targets.</p>
      {NUTRITION_FIELDS.map(([key, label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label}</Label><Input id={`assessment-${key}`} type="number" min="0" value={values[key] ?? ''} onChange={e => set(key, e.target.value)} /></div>)}
      {EXTRA_NUTRITION_FIELDS.map(([key,label]) => <div key={key}><Label htmlFor={`assessment-${key}`}>{label} · optional</Label><Input id={`assessment-${key}`} type="number" min="0" value={values[key] ?? ''} onChange={e => set(key,e.target.value)} /></div>)}
      <Label htmlFor="assessment-supplements">Existing supplements (comma-separated, optional)</Label><Input id="assessment-supplements" value={supplements} onChange={e => setSupplements(e.target.value)} />
    </fieldset>
    <Button variant="outline" onClick={() => setHealthOpen(true)}>Health & physio information</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={saving} onClick={() => { void save().then(ok => { if (ok) onBack(); }); }}>{saving ? 'Saving…' : 'Save & return'}</Button>
    <PhysioHealthIntakeDialog open={healthOpen} onOpenChange={setHealthOpen} isEditMode={physio.setupCompleted} />
  </section>;
}