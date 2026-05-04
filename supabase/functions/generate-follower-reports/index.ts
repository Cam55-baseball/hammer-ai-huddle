import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const PER_CALL_TIMEOUT_MS = 5_000;
const AI_RETRIES = 2;
const AI_BASE_DELAY_MS = 400;

type Role = 'scout' | 'coach';
type ReportType = 'weekly_digest' | 'monthly_deep';
interface FollowerInfo { follower_id: string; player_id: string; follower_role: Role }

type Snapshot = {
  profile: any;
  sessions: any[];
  vaultGrades: any[];
  weaknesses: any[];
  games: any[];
};

type Deltas = {
  sessions_count: number;
  games_count: number;
  avg_bqi: number | null;
  avg_pei: number | null;
  avg_fqi: number | null;
};

// ---------- Safe logging ----------
async function logResult(
  supabase: any,
  fi: Pick<FollowerInfo, 'follower_id' | 'player_id'>,
  reportType: string,
  status: 'success' | 'skipped' | 'failed',
  reason: string | null,
  error: string | null,
  durationMs: number,
  retryable: boolean,
  periodStart: string | null = null,
) {
  try {
    await supabase.from('follower_report_logs').insert({
      follower_id: fi.follower_id,
      player_id: fi.player_id,
      report_type: reportType,
      status,
      reason,
      error,
      duration_ms: durationMs,
      retryable,
      period_start: periodStart,
    });
  } catch (_) { /* never throw from logger */ }
}

// ---------- Active follower discovery ----------
async function getActiveFollowers(supabase: any): Promise<FollowerInfo[]> {
  const { data: follows } = await supabase
    .from('scout_follows')
    .select('scout_id, player_id, status')
    .eq('status', 'accepted');
  if (!follows?.length) return [];

  const followerIds = [...new Set(follows.map((f: any) => f.scout_id as string))];
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role, status')
    .in('user_id', followerIds)
    .in('role', ['scout', 'coach'])
    .eq('status', 'active');

  const roleMap = new Map<string, Role>();
  for (const r of (roles ?? []) as Array<{ user_id: string; role: Role }>) {
    const cur = roleMap.get(r.user_id);
    if (r.role === 'coach' || !cur) roleMap.set(r.user_id, r.role);
  }

  return follows
    .filter((f: any) => roleMap.has(f.scout_id))
    .map((f: any) => ({
      follower_id: f.scout_id as string,
      player_id: f.player_id as string,
      follower_role: roleMap.get(f.scout_id)!,
    }));
}

// ---------- Bulk pre-fetch ----------
async function bulkFetchSnapshots(
  supabase: any,
  playerIds: string[],
  periodStart: string,
  periodEnd: string,
): Promise<Map<string, Snapshot>> {
  const map = new Map<string, Snapshot>();
  if (!playerIds.length) return map;

  const [profilesRes, sessionsRes, gradesRes, weaknessRes, gamesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, sport, position, primary_position, hs_grad_year').in('id', playerIds),
    supabase.from('performance_sessions')
      .select('id, user_id, session_date, module, composite_indexes, drill_blocks, session_type, opponent_level, coach_grade, shared_with_scouts')
      .in('user_id', playerIds)
      .gte('session_date', periodStart)
      .lte('session_date', periodEnd)
      .eq('shared_with_scouts', true)
      .order('session_date', { ascending: false }),
    supabase.from('vault_scout_grades').select('*').in('user_id', playerIds).order('created_at', { ascending: false }),
    supabase.from('hie_weakness_clusters').select('*').in('user_id', playerIds).order('priority_score', { ascending: false }),
    supabase.from('games').select('id, user_id, game_date, opponent_name, league_level, game_summary')
      .in('user_id', playerIds).gte('game_date', periodStart).lte('game_date', periodEnd),
  ]);

  for (const id of playerIds) {
    map.set(id, { profile: null, sessions: [], vaultGrades: [], weaknesses: [], games: [] });
  }
  for (const p of (profilesRes.data ?? []) as any[]) map.get(p.id) && (map.get(p.id)!.profile = p);
  for (const s of (sessionsRes.data ?? []) as any[]) map.get(s.user_id)?.sessions.push(s);
  for (const g of (gradesRes.data ?? []) as any[]) {
    const snap = map.get(g.user_id); if (snap && snap.vaultGrades.length < 2) snap.vaultGrades.push(g);
  }
  for (const w of (weaknessRes.data ?? []) as any[]) {
    const snap = map.get(w.user_id); if (snap && snap.weaknesses.length < 5) snap.weaknesses.push(w);
  }
  for (const g of (gamesRes.data ?? []) as any[]) map.get(g.user_id)?.games.push(g);

  for (const snap of map.values()) {
    if (snap.sessions.length > 40) snap.sessions = snap.sessions.slice(0, 40);
  }
  return map;
}

// ---------- Derivations ----------
function deriveDeltas(snapshot: Snapshot): Deltas {
  const sessions = snapshot.sessions ?? [];
  const composites = sessions
    .map((s: Record<string, unknown>) => s?.composite_indexes)
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object');

  const avg = (key: string): number | null => {
    const vals = composites
      .map((c: Record<string, unknown>) => c?.[key])
      .filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  return {
    sessions_count: sessions.length,
    games_count: snapshot.games?.length ?? 0,
    avg_bqi: avg('BQI'),
    avg_pei: avg('PEI'),
    avg_fqi: avg('FQI'),
  };
}

function deterministicHeadline(snapshot: Snapshot, deltas: Deltas): string {
  const name = snapshot.profile?.full_name ?? 'Player';
  return `${name} recorded ${deltas.sessions_count} sessions and ${deltas.games_count} games. Performance trends remain stable.`;
}

// ---------- Bounded retry AI call ----------
async function callAIWithRetry(payload: unknown): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= AI_RETRIES) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PER_CALL_TIMEOUT_MS);
    try {
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify(payload),
      });
      clearTimeout(t);
      if (!r.ok) throw new Error(`ai_status_${r.status}`);
      const j = await r.json();
      const text = j?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return text.trim();
      throw new Error('ai_empty_response');
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt === AI_RETRIES) break;
      await new Promise(res => setTimeout(res, AI_BASE_DELAY_MS * Math.pow(2, attempt)));
      attempt++;
    }
  }
  console.warn('[ai] exhausted retries', lastErr instanceof Error ? lastErr.message : lastErr);
  return null;
}

async function generateHeadline(snapshot: Snapshot, deltas: Deltas, role: Role): Promise<{ text: string; aiOk: boolean }> {
  const sysPrompt = role === 'coach'
    ? "You are Hammer, an elite player development coach. Write a 2-sentence headline verdict about a followed player's recent progress. Direct, actionable."
    : "You are Hammer, an elite scouting analyst. Write a 2-sentence headline verdict about a followed prospect. Evaluator tone, no prescriptive advice.";
  const userMsg = `Player: ${snapshot.profile?.full_name ?? 'Unknown'} (${snapshot.profile?.sport ?? '?'} / ${snapshot.profile?.primary_position ?? snapshot.profile?.position ?? '?'})\nPeriod metrics: ${JSON.stringify(deltas)}\nWeaknesses: ${(snapshot.weaknesses ?? []).slice(0, 3).map((w: any) => w.cluster_label || w.area).join(', ') || 'none'}\nSessions: ${snapshot.sessions.length}, Games: ${snapshot.games.length}.`;

  const text = await callAIWithRetry({
    model: 'google/gemini-2.5-flash',
    messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userMsg }],
  });
  if (text) return { text, aiOk: true };
  return { text: deterministicHeadline(snapshot, deltas), aiOk: false };
}

function buildReportData(snapshot: Snapshot, deltas: Deltas, role: Role, headline: string) {
  const sessions = snapshot.sessions ?? [];
  const lowBlocks = sessions
    .flatMap((s: any) => (Array.isArray(s.drill_blocks) ? s.drill_blocks : []).map((b: any) => ({ ...b, session_id: s.id, date: s.session_date })))
    .filter((b: any) => typeof b?.execution_grade === 'number')
    .sort((a: any, b: any) => (a.execution_grade ?? 100) - (b.execution_grade ?? 100))
    .slice(0, 3);

  const grades = snapshot.vaultGrades?.[0]?.grades ?? null;
  const prevGrades = snapshot.vaultGrades?.[1]?.grades ?? null;
  const gradeDeltas: Record<string, { current: number; delta: number | null }> = {};
  if (grades && typeof grades === 'object') {
    for (const [k, v] of Object.entries(grades as Record<string, unknown>)) {
      if (typeof v === 'number') {
        const prev = (prevGrades as Record<string, unknown> | null)?.[k];
        gradeDeltas[k] = { current: v, delta: typeof prev === 'number' ? v - prev : null };
      }
    }
  }

  const strengths = Object.entries(gradeDeltas)
    .filter(([, g]) => g.current >= 55)
    .sort((a, b) => b[1].current - a[1].current)
    .slice(0, 3)
    .map(([tool, g]) => ({ tool, grade: g.current, delta: g.delta }));

  const weaknesses = (snapshot.weaknesses ?? []).slice(0, 3).map((w: any) => ({
    area: w.cluster_label || w.area || w.movement_pattern || 'Unspecified',
    severity: w.priority_score ?? w.severity ?? null,
    classification: w.classification ?? 'execution',
  }));

  const data: Record<string, unknown> = {
    headline,
    snapshot: {
      sport: snapshot.profile?.sport ?? null,
      position: snapshot.profile?.primary_position ?? snapshot.profile?.position ?? null,
      hs_grad_year: snapshot.profile?.hs_grad_year ?? null,
    },
    period_metrics: deltas,
    tool_grades: gradeDeltas,
    strengths,
    weaknesses,
    low_blocks: lowBlocks,
    recent_sessions: sessions.slice(0, 10).map((s: any) => ({
      id: s.id, date: s.session_date, module: s.module, type: s.session_type,
      composite: s.composite_indexes, coach_grade: s.coach_grade,
    })),
    recent_games: (snapshot.games ?? []).slice(0, 5),
    prescriptive_fixes: [] as Array<Record<string, unknown>>,
  };

  if (role === 'coach') {
    data.prescriptive_fixes = lowBlocks.map((b: any) => ({
      issue: b.mechanic_id || b.module || 'Low-graded block',
      drill: 'Targeted progression drill — see drill library',
      cue: 'Hold position 2 seconds, then release',
      session_id: b.session_id,
    }));
  }

  return data;
}

// ---------- Per-follower generation (fault-isolated) ----------
async function generateForFollower(
  supabase: any,
  fi: FollowerInfo,
  reportType: ReportType,
  periodStart: string,
  periodEnd: string,
  snapshotCache: Map<string, Snapshot>,
): Promise<{ id?: string; skipped?: boolean; reason?: string; error?: string }> {
  const startedAt = Date.now();

  if (fi.follower_role !== 'scout' && fi.follower_role !== 'coach') {
    await logResult(supabase, fi, reportType, 'skipped', 'invalid_role', null, Date.now() - startedAt, false, periodStart);
    return { skipped: true, reason: 'invalid_role' };
  }

  const snapshot = snapshotCache.get(fi.player_id) ?? { profile: null, sessions: [], vaultGrades: [], weaknesses: [], games: [] };

  // Snapshot validation guard
  if (!Array.isArray(snapshot.sessions) || !Array.isArray(snapshot.games)) {
    await logResult(supabase, fi, reportType, 'skipped', 'invalid_snapshot', null, Date.now() - startedAt, false, periodStart);
    return { skipped: true, reason: 'invalid_snapshot' };
  }

  if (!snapshot.sessions.length && !snapshot.games.length && reportType === 'weekly_digest') {
    await logResult(supabase, fi, reportType, 'skipped', 'no_activity', null, Date.now() - startedAt, false, periodStart);
    return { skipped: true, reason: 'no_activity' };
  }

  try {
    const deltas = deriveDeltas(snapshot);
    const { text: headline, aiOk } = await generateHeadline(snapshot, deltas, fi.follower_role);
    const reportData = buildReportData(snapshot, deltas, fi.follower_role, headline);

    const { data: upserted, error } = await supabase
      .from('follower_reports')
      .upsert({
        follower_id: fi.follower_id,
        player_id: fi.player_id,
        follower_role: fi.follower_role,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        headline,
        report_data: reportData,
        status: 'ready',
      }, { onConflict: 'follower_id,player_id,report_type,period_start' })
      .select('id')
      .single();

    if (error) {
      await logResult(supabase, fi, reportType, 'failed', 'db_upsert_error', error.message, Date.now() - startedAt, true, periodStart);
      return { error: error.message };
    }

    if (!aiOk) {
      // Successful row, but AI fell back — log so retry worker can refresh later
      await logResult(supabase, fi, reportType, 'failed', 'ai_exhausted', null, Date.now() - startedAt, true, periodStart);
    } else {
      await logResult(supabase, fi, reportType, 'success', null, null, Date.now() - startedAt, false, periodStart);
    }
    return { id: upserted.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await logResult(supabase, fi, reportType, 'failed', 'unexpected', msg, Date.now() - startedAt, true, periodStart);
    return { error: msg };
  }
}

// ---------- Period helpers ----------
function periodFor(mode: ReportType, anchorDate?: string): { periodStart: string; periodEnd: string } {
  const today = anchorDate ? new Date(anchorDate) : new Date();
  const periodEnd = today.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(today.getDate() - (mode === 'weekly_digest' ? 7 : 30));
  return { periodStart: start.toISOString().slice(0, 10), periodEnd };
}

// ---------- Entrypoint ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));

    // ===== Retry mode =====
    const retryTargets = Array.isArray(body.retry_targets) ? body.retry_targets : null;
    if (retryTargets && retryTargets.length > 0) {
      let generated = 0, skipped = 0, failed = 0;
      // Group by (reportType, periodStart, periodEnd) so we can bulk-fetch
      const groups = new Map<string, { mode: ReportType; periodStart: string; periodEnd: string; pairs: FollowerInfo[] }>();

      // Resolve roles for target followers
      const followerIds = [...new Set(retryTargets.map((t: any) => t.follower_id).filter((x: any) => typeof x === 'string'))];
      const { data: roles } = followerIds.length
        ? await supabase.from('user_roles').select('user_id, role, status').in('user_id', followerIds).in('role', ['scout', 'coach']).eq('status', 'active')
        : { data: [] as any[] };
      const roleMap = new Map<string, Role>();
      for (const r of (roles ?? []) as any[]) {
        const cur = roleMap.get(r.user_id);
        if (r.role === 'coach' || !cur) roleMap.set(r.user_id, r.role as Role);
      }

      for (const t of retryTargets) {
        if (!t || typeof t.follower_id !== 'string' || typeof t.player_id !== 'string') continue;
        const mode: ReportType = t.report_type === 'monthly_deep' ? 'monthly_deep' : 'weekly_digest';
        const role = roleMap.get(t.follower_id);
        if (!role) continue;
        const periodStart = t.period_start ?? periodFor(mode).periodStart;
        const periodEnd = t.period_end ?? periodFor(mode, periodStart ? new Date(new Date(periodStart).getTime() + (mode === 'weekly_digest' ? 7 : 30) * 86400000).toISOString().slice(0, 10) : undefined).periodEnd;
        const key = `${mode}|${periodStart}|${periodEnd}`;
        if (!groups.has(key)) groups.set(key, { mode, periodStart, periodEnd, pairs: [] });
        groups.get(key)!.pairs.push({ follower_id: t.follower_id, player_id: t.player_id, follower_role: role });
      }

      for (const grp of groups.values()) {
        const playerIds = [...new Set(grp.pairs.map(p => p.player_id))];
        const cache = await bulkFetchSnapshots(supabase, playerIds, grp.periodStart, grp.periodEnd);
        const BATCH = 5;
        for (let i = 0; i < grp.pairs.length; i += BATCH) {
          const batch = grp.pairs.slice(i, i + BATCH);
          const results = await Promise.all(batch.map(p =>
            generateForFollower(supabase, p, grp.mode, grp.periodStart, grp.periodEnd, cache),
          ));
          for (const r of results) {
            if (r.id) generated++;
            else if (r.skipped) skipped++;
            else failed++;
          }
        }
      }

      // Mark old failed log rows for these pairs as no longer retryable
      for (const t of retryTargets) {
        if (!t?.follower_id || !t?.player_id) continue;
        try {
          await supabase.from('follower_report_logs')
            .update({ retryable: false })
            .eq('follower_id', t.follower_id)
            .eq('player_id', t.player_id)
            .eq('report_type', t.report_type ?? 'weekly_digest')
            .eq('status', 'failed')
            .eq('retryable', true)
            .lt('created_at', new Date(Date.now() - 1000).toISOString());
        } catch (_) { /* swallow */ }
      }

      return new Response(JSON.stringify({ ok: true, mode: 'retry', generated, skipped, failed, total: retryTargets.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Normal scheduled mode =====
    const mode: ReportType = body.mode === 'monthly_deep' ? 'monthly_deep' : 'weekly_digest';
    const targetedFollower = typeof body.follower_id === 'string' ? body.follower_id : undefined;
    const targetedPlayer = typeof body.player_id === 'string' ? body.player_id : undefined;

    const { periodStart, periodEnd } = periodFor(mode);

    let pairs = await getActiveFollowers(supabase);
    if (targetedFollower) pairs = pairs.filter(p => p.follower_id === targetedFollower);
    if (targetedPlayer) pairs = pairs.filter(p => p.player_id === targetedPlayer);

    const followerIds = [...new Set(pairs.map(p => p.follower_id))];
    const { data: prefs } = followerIds.length
      ? await supabase.from('follower_notification_prefs').select('*').in('follower_id', followerIds)
      : { data: [] as any[] };
    const prefMap = new Map((prefs ?? []).map((p: any) => [p.follower_id, p]));
    const prefKey = mode === 'weekly_digest' ? 'weekly_digest_enabled' : 'monthly_per_player_enabled';
    pairs = pairs.filter(p => {
      const pref = prefMap.get(p.follower_id);
      return !pref || pref[prefKey] !== false;
    });

    let capped = false;
    if (pairs.length > 200) { pairs = pairs.slice(0, 200); capped = true; }

    const playerIds = [...new Set(pairs.map(p => p.player_id))];
    const snapshotCache = await bulkFetchSnapshots(supabase, playerIds, periodStart, periodEnd);

    const BATCH_SIZE = 5;
    let generated = 0, skipped = 0, failed = 0;
    for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
      const batch = pairs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(p =>
        generateForFollower(supabase, p, mode, periodStart, periodEnd, snapshotCache),
      ));
      for (const r of results) {
        if (r.id) generated++;
        else if (r.skipped) skipped++;
        else failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, mode, generated, skipped, failed, total: pairs.length, capped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[generate-follower-reports]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
