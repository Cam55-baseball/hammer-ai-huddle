import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  computeFoundationTriggers,
  scoreFoundationCandidates,
  type FoundationDomain,
  type FoundationMeta,
  type FoundationScoreResult,
  type FoundationSnapshot,
  type FoundationTrigger,
} from '@/lib/foundationVideos';
import { TIER_BOOST } from '@/lib/videoTier';

interface Options {
  /** Limit candidates to this domain (e.g. user's primary). When omitted, all foundations. */
  domain?: FoundationDomain;
  /** Max number of suggestions returned. Defaults to 4. */
  limit?: number;
  /** When false, returns ALL foundations (no trigger filter) — used for the manual browse shelf. */
  triggerGated?: boolean;
}

export function useFoundationVideos(opts: Options = {}) {
  const { user } = useAuth();
  const { domain, limit = 4, triggerGated = true } = opts;
  const [results, setResults] = useState<FoundationScoreResult[]>([]);
  const [activeTriggers, setActiveTriggers] = useState<FoundationTrigger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snapshot = user ? await fetchFoundationSnapshot(user.id) : null;
        const triggers = snapshot ? computeFoundationTriggers(snapshot) : [];
        if (!cancelled) setActiveTriggers(triggers);

        const { data, error } = await (supabase as any)
          .from('library_videos')
          .select('id, title, video_url, thumbnail_url, distribution_tier, foundation_meta')
          .eq('video_class', 'foundation')
          .neq('distribution_tier', 'blocked')
          .limit(200);
        if (error) throw error;

        const candidates = (data ?? [])
          .filter((v: any) => v.foundation_meta && (!domain || v.foundation_meta.domain === domain))
          .map((v: any) => ({
            id: v.id,
            title: v.title,
            video_url: v.video_url,
            thumbnail_url: v.thumbnail_url,
            distribution_tier: v.distribution_tier,
            foundation_meta: v.foundation_meta as FoundationMeta,
          }));

        const scored = scoreFoundationCandidates({
          candidates,
          activeTriggers: triggerGated ? triggers : [],
          tierBoost: TIER_BOOST as any,
        }).slice(0, limit);

        if (!cancelled) setResults(scored);
      } catch (e) {
        console.error('useFoundationVideos failed:', e);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, domain, limit, triggerGated]);

  return { results, activeTriggers, loading };
}

async function fetchFoundationSnapshot(userId: string): Promise<FoundationSnapshot> {
  // Defensive: only pull what we need; degrade gracefully on missing data.
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const sinceLayoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  const [profileRes, logsRes] = await Promise.all([
    supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle(),
    (supabase as any)
      .from('custom_activity_logs')
      .select('entry_date, completed')
      .eq('user_id', userId)
      .gte('entry_date', sinceLayoff)
      .order('entry_date', { ascending: false })
      .limit(200),
  ]);

  const createdAt = (profileRes.data as any)?.created_at;
  const accountAgeDays = createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400_000))
    : 999;

  // Layoff = longest gap between consecutive completed entry_dates in the last 30d.
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

  return {
    accountAgeDays,
    domainRepCount: {}, // not yet wired; treated as fragile=false unless domain-specific data added
    regulationLow3d: false,
    seasonPhase: null,
    layoffDays,
    philosophyDriftIntents14d: 0,
  };
}
