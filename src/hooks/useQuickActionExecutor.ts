import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type QuickActionType =
  | 'complete_nn'
  | 'save_streak'
  | 'log_session'
  | 'rest_today'
  | 'reset_2min';

interface QuickActionPayload {
  template_id?: string;
  [k: string]: any;
}

/**
 * Frictionless action executor — runs identity-restoring actions in <500ms,
 * writes to custom_activity_logs (single source of truth), and triggers
 * engine recompute. Returns identity-feedback string for confirmation.
 */
export function useQuickActionExecutor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const recompute = () => {
    if (!user) return;
    supabase.functions.invoke('evaluate-behavioral-state', { body: { user_id: user.id } }).catch(() => {});
    supabase.functions.invoke('compute-hammer-state', { body: { user_id: user.id } }).catch(() => {});
  };

  const execute = async (
    action: QuickActionType,
    payload: QuickActionPayload = {}
  ): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Not authenticated' };
    setRunning(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      switch (action) {
        case 'complete_nn':
        case 'save_streak':
        case 'log_session': {
          // Choose template: use provided ID, else smallest non-negotiable, else any active
          let templateId = payload.template_id as string | undefined;
          if (!templateId) {
            const { data: nn } = await (supabase as any)
              .from('custom_activity_templates')
              .select('id, duration_minutes')
              .eq('user_id', user.id)
              .eq('is_non_negotiable', true)
              .is('deleted_at', null)
              .order('duration_minutes', { ascending: true, nullsFirst: true })
              .limit(1);
            templateId = nn?.[0]?.id;
          }
          if (!templateId) {
            // Fallback: invoke save-streak edge function
            const { error } = await supabase.functions.invoke('save-streak', { body: { user_id: user.id } });
            if (error) throw error;
          } else {
            await (supabase as any)
              .from('custom_activity_logs')
              .insert({
                user_id: user.id,
                template_id: templateId,
                entry_date: today,
                completed: true,
                completed_at: new Date().toISOString(),
                completion_state: 'completed',
                completion_method: action,
              });
          }
          recompute();
          qc.invalidateQueries({ queryKey: ['game-plan'] });
          qc.invalidateQueries({ queryKey: ['custom-activities'] });
          return { ok: true, message: action === 'save_streak' ? 'Streak saved. LOCKED IN behavior.' : "That's LOCKED IN behavior." };
        }

        case 'rest_today': {
          const { data: existing } = await (supabase as any)
            .from('user_rest_day_overrides')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle();
          if (!existing) {
            await (supabase as any)
              .from('user_rest_day_overrides')
              .insert({ user_id: user.id, date: today, type: 'manual_rest' });
          }
          recompute();
          qc.invalidateQueries({ queryKey: ['rest-day-overrides', user.id] });
          return { ok: true, message: 'Rest day declared. Streak protected.' };
        }

        case 'reset_2min': {
          // Light reset action — log behavioral event for cognitive reset
          await (supabase as any)
            .from('behavioral_events')
            .insert({
              user_id: user.id,
              event_type: 'consistency_recover',
              event_date: today,
              magnitude: 0,
              metadata: { source: 'quick_reset' },
            });
          return { ok: true, message: 'Reset logged. Re-enter the standard.' };
        }
      }
    } catch (e: any) {
      console.warn('[quick-action] failed', e);
      toast.error('Action failed', { description: e.message });
      return { ok: false, message: e.message ?? 'Failed' };
    } finally {
      setRunning(false);
    }
    return { ok: false, message: 'Unknown action' };
  };

  return { execute, running };
}
