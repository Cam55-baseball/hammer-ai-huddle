import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TagSuggestion {
  id: string;
  video_id: string;
  layer: string;
  suggested_key: string;
  confidence: number;
  source: string;
  status: string;
  reasoning: string | null;
  created_at: string;
  video_title?: string;
}

export interface RuleSuggestion {
  id: string;
  skill_domain: string;
  movement_key: string;
  result_key: string | null;
  context_key: string | null;
  correction_key: string;
  confidence: number;
  reasoning: string | null;
  sample_size: number;
  avg_improvement: number;
  status: string;
  created_at: string;
}

export function usePendingTagSuggestions() {
  return useQuery({
    queryKey: ['video-tag-suggestions', 'pending'],
    queryFn: async (): Promise<TagSuggestion[]> => {
      const { data, error } = await (supabase as any)
        .from('video_tag_suggestions')
        .select('*, library_videos!inner(title)')
        .eq('status', 'pending')
        .order('confidence', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        video_title: r.library_videos?.title,
      }));
    },
  });
}

export function usePendingRuleSuggestions() {
  return useQuery({
    queryKey: ['video-rule-suggestions', 'pending'],
    queryFn: async (): Promise<RuleSuggestion[]> => {
      const { data, error } = await (supabase as any)
        .from('video_rule_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('confidence', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSuggestionActions() {
  const qc = useQueryClient();

  const approveTag = async (s: TagSuggestion) => {
    // Look up taxonomy id
    const { data: tax, error: tErr } = await (supabase as any)
      .from('video_tag_taxonomy')
      .select('id')
      .eq('layer', s.layer)
      .eq('key', s.suggested_key)
      .maybeSingle();
    if (tErr || !tax) {
      toast.error('Taxonomy entry not found');
      return;
    }
    const { error: aErr } = await (supabase as any)
      .from('video_tag_assignments')
      .upsert({ video_id: s.video_id, tag_id: tax.id, weight: 2 });
    if (aErr) { toast.error(aErr.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('video_tag_suggestions')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    toast.success('Tag approved');
    qc.invalidateQueries({ queryKey: ['video-tag-suggestions'] });
  };

  const rejectTag = async (s: TagSuggestion) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('video_tag_suggestions')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    qc.invalidateQueries({ queryKey: ['video-tag-suggestions'] });
  };

  const approveRule = async (s: RuleSuggestion) => {
    const { error } = await (supabase as any).from('video_tag_rules').insert({
      skill_domain: s.skill_domain,
      movement_key: s.movement_key,
      result_key: s.result_key,
      context_key: s.context_key,
      correction_key: s.correction_key,
      strength: Math.max(3, Math.round(s.confidence * 10)),
      active: true,
      notes: 'discovered_v1',
    });
    if (error) { toast.error(error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('video_rule_suggestions')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    toast.success('Rule activated');
    qc.invalidateQueries({ queryKey: ['video-rule-suggestions'] });
  };

  const rejectRule = async (s: RuleSuggestion) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from('video_rule_suggestions')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', s.id);
    qc.invalidateQueries({ queryKey: ['video-rule-suggestions'] });
  };

  const bulkApproveTags = async (suggestions: TagSuggestion[], minConfidence = 0.8) => {
    const eligible = suggestions.filter(s => s.confidence >= minConfidence);
    for (const s of eligible) await approveTag(s);
    toast.success(`Approved ${eligible.length} tags`);
  };

  return { approveTag, rejectTag, approveRule, rejectRule, bulkApproveTags };
}

export async function triggerAnalyzeVideo(videoId: string) {
  const { data, error } = await supabase.functions.invoke('analyze-video-description', {
    body: { videoId },
  });
  if (error) throw error;
  return data;
}
