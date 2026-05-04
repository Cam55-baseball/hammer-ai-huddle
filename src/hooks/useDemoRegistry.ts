import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DemoNode {
  id: string;
  node_type: 'tier' | 'category' | 'submodule';
  slug: string;
  parent_slug: string | null;
  title: string;
  tagline: string | null;
  icon_name: string | null;
  component_key: string | null;
  display_order: number;
  is_active: boolean;
  ab_variant: string | null;
}

const CACHE_KEY = 'demo_registry_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function useDemoRegistry() {
  const [nodes, setNodes] = useState<DemoNode[]>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return data;
    } catch { /* noop */ }
    return [];
  });
  const [loading, setLoading] = useState(nodes.length === 0);

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
        setNodes(data as DemoNode[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* noop */ }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const tiers = nodes.filter(n => n.node_type === 'tier');
  const categoriesOf = (tier: string) => nodes.filter(n => n.node_type === 'category' && n.parent_slug === tier);
  const submodulesOf = (category: string) => nodes.filter(n => n.node_type === 'submodule' && n.parent_slug === category);
  const findBySlug = (slug: string) => nodes.find(n => n.slug === slug);
  const allSubmodules = nodes.filter(n => n.node_type === 'submodule');

  return { nodes, tiers, categoriesOf, submodulesOf, findBySlug, allSubmodules, loading };
}
