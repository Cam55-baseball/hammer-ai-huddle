import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoAudience } from './useDemoAudience';

export interface DemoNode {
  id: string;
  node_type: 'tier' | 'category' | 'submodule';
  slug: string;
  parent_slug: string | null;
  parent_id: string | null;
  title: string;
  tagline: string | null;
  icon_name: string | null;
  component_key: string | null;
  display_order: number;
  is_active: boolean;
  ab_variant: string | null;
  is_recommended: boolean;
  recommended_order: number | null;
  audience: 'all' | 'team';
}

const CACHE_KEY = 'demo_registry_v3';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function useDemoRegistry() {
  const audience = useDemoAudience();
  const [allNodes, setAllNodes] = useState<DemoNode[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return data;
    } catch { /* noop */ }
    return [];
  });
  const [loading, setLoading] = useState(allNodes.length === 0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('demo_registry')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (!alive) return;
      if (data) {
        setAllNodes(data as DemoNode[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* noop */ }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Filter team-only nodes when current viewer isn't a team audience.
  const nodes = useMemo<DemoNode[]>(() => {
    if (audience === 'team') return allNodes;
    return allNodes.filter(n => (n.audience ?? 'all') !== 'team');
  }, [allNodes, audience]);

  const tiers = nodes.filter(n => n.node_type === 'tier');
  const categoriesOf = (tier: string) => nodes
    .filter(n => n.node_type === 'category' && n.parent_slug === tier)
    .sort((a, b) => (b.is_recommended ? 1 : 0) - (a.is_recommended ? 1 : 0) || a.display_order - b.display_order);
  const submodulesOf = (category: string) => nodes.filter(n => n.node_type === 'submodule' && n.parent_slug === category);
  const findBySlug = (slug: string) => nodes.find(n => n.slug === slug);
  const allSubmodules = nodes.filter(n => n.node_type === 'submodule');

  const recommendedSequence = nodes
    .filter(n => n.node_type === 'submodule' && n.is_recommended && n.recommended_order != null)
    .sort((a, b) => (a.recommended_order ?? 0) - (b.recommended_order ?? 0));

  return { nodes, tiers, categoriesOf, submodulesOf, findBySlug, allSubmodules, recommendedSequence, loading };
}
