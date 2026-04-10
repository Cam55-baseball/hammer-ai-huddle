import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { getProgressionRange, expandRange } from '@/utils/progressionMapping';

export type SortOption = 'recommended' | 'level' | 'recent';

export interface LibraryDrill {
  id: string;
  name: string;
  description: string | null;
  ai_context: string | null;
  video_url: string | null;
  module: string;
  sport: string;
  progression_level: number;
  difficulty_levels: string[] | null;
  premium: boolean;
  created_at: string | null;
  instructions: Record<string, any> | null;
  positions: string[];
  tags: string[];
  isRecommended: boolean;
  matchReasons: string[];
}

interface PlayerContext {
  sport: string;
  position: string | null;
  experienceLevel: string | null;
  detectedIssues: string[];
}

export function usePlayerDrillLibrary() {
  const { user } = useAuth();
  const { modules: subscribedModules } = useSubscription();
  const userHasPremium = subscribedModules.length > 0;

  const [drills, setDrills] = useState<LibraryDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerContext, setPlayerContext] = useState<PlayerContext>({
    sport: 'baseball', position: null, experienceLevel: null, detectedIssues: [],
  });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('recommended');
  const [positionFilter, setPositionFilter] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Get player context
      const [mpiRes, profileRes, weaknessRes] = await Promise.all([
        supabase.from('athlete_mpi_settings').select('sport, primary_position').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('experience_level').eq('id', user.id).maybeSingle(),
        supabase.from('weakness_scores').select('weakness_metric, score').eq('user_id', user.id).order('computed_at', { ascending: false }).limit(50),
      ]);

      const sport = mpiRes.data?.sport || 'baseball';
      const position = mpiRes.data?.primary_position || null;
      const experienceLevel = profileRes.data?.experience_level || null;
      // Ranked selection: sort by score desc, take top 10, no arbitrary threshold
      const detectedIssues = (weaknessRes.data || [])
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(w => w.weakness_metric);

      setPlayerContext({ sport, position, experienceLevel, detectedIssues });

      // 2. Get progression range
      const range = getProgressionRange(experienceLevel);

      // 3. Fetch drills
      let query = supabase
        .from('drills')
        .select('id, name, description, ai_context, video_url, module, sport, progression_level, difficulty_levels, premium, created_at, instructions')
        .eq('is_published', true)
        .eq('is_active', true)
        .eq('sport', sport)
        .gte('progression_level', range[0])
        .lte('progression_level', range[1]);

      // Backend subscription filtering: don't return premium drills to free users
      if (!userHasPremium) {
        query = query.eq('premium', false);
      }

      let { data: drillRows, error } = await query;

      // Fallback: expand range if no drills found
      if (!error && (!drillRows || drillRows.length === 0)) {
        const expanded = expandRange(range);
        const fallback = await supabase
          .from('drills')
          .select('id, name, description, ai_context, video_url, module, sport, progression_level, difficulty_levels, premium, created_at, instructions')
          .eq('is_published', true)
          .eq('is_active', true)
          .eq('sport', sport)
          .gte('progression_level', expanded[0])
          .lte('progression_level', expanded[1]);
        drillRows = fallback.data;
      }

      if (!drillRows || drillRows.length === 0) {
        setDrills([]);
        setLoading(false);
        return;
      }

      const drillIds = drillRows.map(d => d.id);

      // 4. Fetch positions and tags in parallel
      const [posRes, tagMapRes] = await Promise.all([
        supabase.from('drill_positions').select('drill_id, position').in('drill_id', drillIds),
        supabase.from('drill_tag_map').select('drill_id, tag_id, drill_tags(name)').in('drill_id', drillIds),
      ]);

      const posMap = new Map<string, string[]>();
      for (const p of posRes.data || []) {
        const arr = posMap.get(p.drill_id) || [];
        arr.push(p.position);
        posMap.set(p.drill_id, arr);
      }

      const tagMap = new Map<string, string[]>();
      for (const t of tagMapRes.data || []) {
        const arr = tagMap.get(t.drill_id) || [];
        const tagName = (t as any).drill_tags?.name;
        if (tagName) arr.push(tagName);
        tagMap.set(t.drill_id, arr);
      }

      // 5. Build library drills with recommendation flags
      const issueSet = new Set(detectedIssues.map(i => i.toLowerCase()));

      const libraryDrills: LibraryDrill[] = drillRows.map(d => {
        const tags = tagMap.get(d.id) || [];
        const positions = posMap.get(d.id) || [];
        const matchingTags = tags.filter(t => issueSet.has(t.toLowerCase()));
        return {
          ...d,
          positions,
          tags,
          // Strip video_url for non-premium users
          video_url: userHasPremium ? d.video_url : null,
          isRecommended: matchingTags.length > 0,
          matchReasons: matchingTags.map(t => `Addresses your ${t.replace(/_/g, ' ')} weakness`),
        };
      });

      // Filter by position (strict: exclude drills with no positions)
      if (position && !positionFilter) {
        const posFiltered = libraryDrills.filter(
          d => d.positions.includes(position)
        );
        // Fallback: if no drills match position, show all
        setDrills(posFiltered.length > 0 ? posFiltered : libraryDrills);
      } else {
        setDrills(libraryDrills);
      }
    } catch (err) {
      console.error('Failed to fetch drill library:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, positionFilter, userHasPremium]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Apply search, position filter, and sort
  const filteredDrills = useMemo(() => {
    let result = [...drills];

    if (positionFilter) {
      // Strict: only drills that explicitly list this position
      const posFiltered = result.filter(d => d.positions.includes(positionFilter));
      result = posFiltered.length > 0 ? posFiltered : result;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case 'recommended':
        result.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
        break;
      case 'level':
        result.sort((a, b) => a.progression_level - b.progression_level);
        break;
      case 'recent':
        result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        break;
    }

    return result;
  }, [drills, search, sort, positionFilter]);

  // Unique positions across all drills for filter chips
  const availablePositions = useMemo(() => {
    const all = new Set<string>();
    drills.forEach(d => d.positions.forEach(p => all.add(p)));
    return Array.from(all).sort();
  }, [drills]);

  return {
    drills: filteredDrills,
    loading,
    playerContext,
    search, setSearch,
    sort, setSort,
    positionFilter, setPositionFilter,
    availablePositions,
  };
}
