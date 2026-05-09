import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  computeFoundationTriggers,
  parseFoundationMeta,
  scoreFoundationCandidates,
  type FoundationDomain,
  type FoundationScoreResult,
  type FoundationSnapshot,
  type FoundationTrigger,
} from '@/lib/foundationVideos';
import { TIER_BOOST } from '@/lib/videoTier';
import { buildTraceRows, enqueueFoundationTraces, type SurfaceOrigin } from '@/lib/foundationTracing';

interface Options {
  /** Limit candidates to this domain (e.g. user's primary). When omitted, all foundations. */
  domain?: FoundationDomain;
  /** Max number of suggestions returned. Defaults to 4. */
  limit?: number;
  /** When false, returns ALL foundations (no trigger filter) — used for the manual browse shelf. */
  triggerGated?: boolean;
  /** Where these recommendations are being surfaced (drives observability traces). */
  surface?: SurfaceOrigin;
}

export function useFoundationVideos(opts: Options = {}) {
  const { user } = useAuth();
  const { domain, limit = 4, triggerGated = true, surface = 'library' } = opts;
  const [results, setResults] = useState<FoundationScoreResult[]>([]);
  const [activeTriggers, setActiveTriggers] = useState<FoundationTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Cross-tab invalidation: re-run when video is watched in another tab.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('data-sync');
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === 'video_watched' || ev.data?.type === 'foundation_outcome') {
        setRefreshTick(t => t + 1);
      }
    };
    ch.addEventListener('message', onMsg);
    return () => { ch.removeEventListener('message', onMsg); ch.close(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snapshot = user ? await fetchFoundationSnapshot(user.id) : null;
        const triggers = snapshot ? computeFoundationTriggers(snapshot) : [];
        if (!cancelled) setActiveTriggers(triggers);

        // Recently-watched set (last 21d) for spam suppression.
        const recentlyWatched = user
          ? await fetchRecentlyWatchedVideoIds(user.id, 21)
          : new Set<string>();

        const { data, error } = await (supabase as any)
          .from('library_videos')
          .select('id, title, video_url, thumbnail_url, distribution_tier, foundation_meta, foundation_effectiveness')
          .eq('video_class', 'foundation')
          .neq('distribution_tier', 'blocked')
          .limit(200);
        if (error) throw error;

        const candidates = (data ?? [])
          .map((v: any) => {
            // Defensive parse — never throw inside scorer.
            const meta = parseFoundationMeta(v.foundation_meta);
            if (!meta) return null;
            // video_url integrity (project core rule).
            if (!v.video_url || !String(v.video_url).trim()) return null;
            if (domain && meta.domain !== domain) return null;
            return {
              id: v.id,
              title: v.title,
              video_url: v.video_url,
              thumbnail_url: v.thumbnail_url,
              distribution_tier: v.distribution_tier,
              foundation_meta: meta,
              recentlyWatched21d: recentlyWatched.has(v.id),
              effectiveness: (v.foundation_effectiveness && typeof v.foundation_effectiveness === 'object')
                ? v.foundation_effectiveness
                : undefined,
            };
          })
          .filter(Boolean) as Parameters<typeof scoreFoundationCandidates>[0]['candidates'];

        const scored = scoreFoundationCandidates({
          candidates,
          activeTriggers: triggerGated ? triggers : [],
          tierBoost: TIER_BOOST as any,
        }).slice(0, limit);

        if (!cancelled) setResults(scored);

        // Wave A — observability: log each surfaced recommendation.
        // Fire-and-forget; never blocks render.
        if (user && scored.length > 0) {
          const rows = buildTraceRows({
            userId: user.id,
            surface,
            activeTriggers: triggerGated ? triggers : [],
            results: scored,
          });
          enqueueFoundationTraces(rows);
        }
      } catch (e) {
        console.error('useFoundationVideos failed:', e);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, domain, limit, triggerGated, refreshTick]);

  return { results, activeTriggers, loading };
}

async function fetchRecentlyWatchedVideoIds(userId: string, days: number): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await supabase
    .from('library_video_analytics')
    .select('video_id')
    .eq('user_id', userId)
    .eq('action', 'view')
    .gte('created_at', since)
    .limit(500);
  if (error) {
    console.warn('recentlyWatched fetch failed:', error);
    return new Set();
  }
  return new Set((data ?? []).map((r: any) => r.video_id).filter(Boolean));
}

async function fetchFoundationSnapshot(userId: string): Promise<FoundationSnapshot> {
  const sinceLayoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [profileRes, settingsRes, logsRes, snapshotRes] = await Promise.all([
    supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle(),
    (supabase as any).from('athlete_mpi_settings').select('sport, primary_position').eq('user_id', userId).maybeSingle(),
    (supabase as any)
      .from('custom_activity_logs')
      .select('entry_date, completed')
      .eq('user_id', userId)
      .gte('entry_date', sinceLayoff)
      .order('entry_date', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('engine_snapshot_versions')
      .select('output, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2),
  ]);

  const createdAt = (profileRes.data as any)?.created_at;
  const accountAgeDays = createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400_000))
    : 999;

  // Layoff: longest gap between consecutive completed entry_dates in last 30d.
  const dates = (logsRes.data ?? [])
    .filter((r: any) => r.completed)
    .map((r: any) => r.entry_date)
    .sort();
  let layoffDays = 0;
  for (let i = 1; i < dates.length; i++) {
    const gap = (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86400_000;
    if (gap > layoffDays) layoffDays = gap;
  }
  if (dates.length > 0) {
    const lastGap = (Date.now() - new Date(dates[dates.length - 1]).getTime()) / 86400_000;
    if (lastGap > layoffDays) layoffDays = lastGap;
  }

  // BQI/PEI deltas from latest two engine snapshots (if available).
  let bqiDelta7d: number | undefined;
  let peiDelta7d: number | undefined;
  const snaps = (snapshotRes.data ?? []) as any[];
  if (snaps.length >= 2) {
    const cur = snaps[0]?.output ?? {};
    const prev = snaps[1]?.output ?? {};
    if (typeof cur.bqi === 'number' && typeof prev.bqi === 'number') bqiDelta7d = cur.bqi - prev.bqi;
    if (typeof cur.pei === 'number' && typeof prev.pei === 'number') peiDelta7d = cur.pei - prev.pei;
  }

  // Primary domain inferred from sport + position. Conservative: hitting + (pitching|fielding).
  const sport = (settingsRes.data as any)?.sport as string | undefined;
  const pos = String((settingsRes.data as any)?.primary_position ?? '').toLowerCase();
  const primaryDomains: FoundationDomain[] = ['hitting'];
  if (pos.includes('pitch')) primaryDomains.push('pitching');
  else if (pos) primaryDomains.push('fielding', 'throwing');
  void sport;

  return {
    accountAgeDays,
    domainRepCount: {}, // reps-per-domain not yet tracked at activity level; trigger gracefully suppressed
    bqiDelta7d,
    peiDelta7d,
    regulationLow3d: false, // not wired yet; safe default = no false fires
    seasonPhase: null,
    layoffDays,
    philosophyDriftIntents14d: 0,
    primaryDomains,
  };
}
