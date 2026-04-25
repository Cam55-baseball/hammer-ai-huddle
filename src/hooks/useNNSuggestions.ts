import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface NNSuggestion {
  id: string;
  template_id: string;
  score: number;
  completion_rate: number;
  total_completions_14d: number;
  consistency_streak: number;
  status: 'active' | 'accepted' | 'dismissed';
  // Joined template fields
  template?: {
    id: string;
    title: string;
    icon: string | null;
    color: string | null;
    display_nickname: string | null;
    is_non_negotiable: boolean;
  } | null;
}

const MAX_VISIBLE = 3;

/**
 * Behavior-derived Non-Negotiable suggestions.
 * Surfaces up to 3 active suggestions ordered by confidence score.
 * One-tap accept flips `is_non_negotiable` and triggers engine recompute.
 */
export function useNNSuggestions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['nn-suggestions', user?.id],
    queryFn: async (): Promise<NNSuggestion[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('user_nn_suggestions')
        .select(`
          id, template_id, score, completion_rate,
          total_completions_14d, consistency_streak, status,
          template:custom_activity_templates!inner (
            id, title, description, icon, color, display_nickname, is_non_negotiable,
            purpose, action, success_criteria, source
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('score', { ascending: false })
        .limit(MAX_VISIBLE);

      if (error) {
        console.warn('[useNNSuggestions] fetch failed', error);
        return [];
      }
      // Defensive client filter — never surface for already-NN templates
      return ((data ?? []) as NNSuggestion[]).filter(
        (s) => s.template && !s.template.is_non_negotiable
      );
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`nn-suggestions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_nn_suggestions', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['nn-suggestions', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const recompute = () => {
    if (!user?.id) return;
    supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } }).catch(() => {});
    supabase.functions.invoke('compute-hammer-state',     { body: { user_id: user.id } }).catch(() => {});
  };

  const accept = async (suggestion: NNSuggestion) => {
    if (!user?.id) return;
    // Phase 12.1 — Strict NN context contract on accept.
    // No filler defaults. We build a candidate from the template's actual
    // fields and validate it through the same renderer-grade contract.
    // If the candidate doesn't pass, we block the accept and route the user
    // to the builder. The suggestion stays active so they can act on it.
    const tpl = suggestion.template as any;
    const candidatePurpose = (tpl?.purpose ?? '').trim();
    const candidateAction = ((tpl?.action ?? tpl?.description ?? '') as string).trim();
    const candidateSuccess = (tpl?.success_criteria ?? '').trim();
    const candidateTitle = (tpl?.title ?? '').trim();

    const ctx = buildNNContext({
      title: candidateTitle,
      purpose: candidatePurpose,
      action: candidateAction,
      success_criteria: candidateSuccess,
      description: tpl?.description ?? '',
      source: tpl?.source ?? 'Custom',
    });

    if (!ctx) {
      toast.error(
        'This activity needs more detail before it can be a Non-Negotiable. Open it in the builder to add Purpose, Action, and Success Criteria.'
      );
      return;
    }

    // Optimistic remove
    qc.setQueryData<NNSuggestion[] | undefined>(
      ['nn-suggestions', user.id],
      (prev) => (prev ?? []).filter((s) => s.id !== suggestion.id),
    );
    try {
      const [tplRes, sugRes] = await Promise.all([
        (supabase as any)
          .from('custom_activity_templates')
          .update({
            is_non_negotiable: true,
            // Validated values only — no defaults, no filler
            purpose: ctx.purpose,
            action: ctx.action,
            success_criteria: ctx.successCriteria,
            source: ctx.source,
          })
          .eq('id', suggestion.template_id)
          .eq('user_id', user.id),
        (supabase as any)
          .from('user_nn_suggestions')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', suggestion.id),
      ]);
      if (tplRes.error || sugRes.error) throw (tplRes.error || sugRes.error);
      toast.success('Standard locked. This is now required daily.');
      recompute();
      qc.invalidateQueries({ queryKey: ['game-plan'] });
      qc.invalidateQueries({ queryKey: ['custom-activities'] });
    } catch (e) {
      console.error('[useNNSuggestions.accept]', e);
      toast.error('Could not lock standard');
      qc.invalidateQueries({ queryKey: ['nn-suggestions', user.id] });
    }
  };

  const dismiss = async (suggestion: NNSuggestion) => {
    if (!user?.id) return;
    qc.setQueryData<NNSuggestion[] | undefined>(
      ['nn-suggestions', user.id],
      (prev) => (prev ?? []).filter((s) => s.id !== suggestion.id),
    );
    try {
      const { error } = await (supabase as any)
        .from('user_nn_suggestions')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', suggestion.id);
      if (error) throw error;
    } catch (e) {
      console.error('[useNNSuggestions.dismiss]', e);
      qc.invalidateQueries({ queryKey: ['nn-suggestions', user.id] });
    }
  };

  return {
    suggestions: query.data ?? [],
    loading: query.isLoading,
    accept,
    dismiss,
  };
}
