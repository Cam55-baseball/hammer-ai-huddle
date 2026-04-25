import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CustomActivityTemplate, 
  CustomActivityLog, 
  CustomActivityWithLog,
  Exercise,
  MealData,
  CustomField,
  RunningInterval,
  CompletionState,
  CompletionMethod
} from '@/types/customActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getTodayDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { repairRecentCustomActivityLogDatesOncePerDay } from '@/utils/customActivityLogDateRepair';
import { calculateCustomActivityLoad } from '@/utils/customActivityLoadCalculation';

import { TAB_ID } from '@/utils/tabId';

export function useCustomActivities(selectedSport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<CustomActivityTemplate[]>([]);
  const [todayLogs, setTodayLogs] = useState<CustomActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(item => ({
        ...item,
        exercises: (item.exercises as unknown as Exercise[]) || [],
        meals: (item.meals as unknown as MealData) || { items: [], vitamins: [], supplements: [] },
        custom_fields: (item.custom_fields as unknown as CustomField[]) || [],
        intervals: (item.intervals as unknown as RunningInterval[]) || [],
        recurring_days: (item.recurring_days as unknown as number[]) || [],
        embedded_running_sessions: (item.embedded_running_sessions as unknown as any[]) || [],
      })) as unknown as CustomActivityTemplate[];

      setTemplates(parsed);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, [user, selectedSport]);

  // Phase 8 — Monotonic merge: never replace a newer local row with a stale server payload.
  // Compares by updated_at (falls back to created_at). DELETE events apply unconditionally upstream.
  const mergeMonotonic = useCallback(
    (current: CustomActivityLog[], incoming: CustomActivityLog[]): CustomActivityLog[] => {
      const ts = (l: CustomActivityLog) =>
        new Date(((l as unknown as { updated_at?: string }).updated_at) ?? l.created_at ?? 0).getTime();
      const byId = new Map<string, CustomActivityLog>();
      for (const row of current) byId.set(row.id, row);
      for (const row of incoming) {
        const existing = byId.get(row.id);
        if (!existing || ts(row) >= ts(existing)) {
          byId.set(row.id, row);
        }
      }
      // Drop locally-cached rows that no longer exist server-side (server is source of truth for membership).
      const incomingIds = new Set(incoming.map((r) => r.id));
      return Array.from(byId.values()).filter((r) => incomingIds.has(r.id));
    },
    []
  );

  const fetchTodayLogs = useCallback(async () => {
    if (!user) return;

    const today = getTodayDate();

    try {
      const { data, error } = await supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      if (error) throw error;
      const incoming = (data || []) as CustomActivityLog[];
      setTodayLogs((prev) => mergeMonotonic(prev, incoming));
    } catch (error) {
      console.error('Error fetching today logs:', error);
    }
  }, [user, mergeMonotonic]);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    if (user) {
      try {
        await repairRecentCustomActivityLogDatesOncePerDay(user.id, 7);
      } catch (error) {
        console.warn('[useCustomActivities] Date repair failed:', error);
      }
    }

    await Promise.all([fetchTemplates(), fetchTodayLogs()]);
    setLoading(false);
  }, [fetchTemplates, fetchTodayLogs, user]);


  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime sync: refresh todayLogs on any custom_activity_logs mutation for this user.
  // Closes cross-tab/external-write desync (GamePlanCard uses local state, not react-query).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`custom-activity-logs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_activity_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTodayLogs();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchTodayLogs]);

  // Get activities scheduled for today (recurring + one-off with logs)
  const getTodayActivities = useCallback((): CustomActivityWithLog[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const todayDate = getTodayDate();

    const activities: CustomActivityWithLog[] = [];

    templates.forEach(template => {
      const log = todayLogs.find(l => l.template_id === template.id);
      
      // Check if scheduled for today via recurring
      const isRecurringToday = template.recurring_active && 
        template.recurring_days.includes(dayOfWeek);
      
      // Check if there's a log for today (manually added)
      const hasLogToday = !!log;

      if (isRecurringToday || hasLogToday) {
        activities.push({
          template,
          log,
          isRecurring: template.recurring_active && template.recurring_days.length > 0,
          isScheduledForToday: isRecurringToday || hasLogToday,
        });
      }
    });

    return activities;
  }, [templates, todayLogs]);

  // Get favorited templates for quick add
  const getFavorites = useCallback((): CustomActivityTemplate[] => {
    return templates.filter(t => t.is_favorited);
  }, [templates]);

  // Create a new template
  const createTemplate = async (
    data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    scheduleForToday: boolean = false
  ): Promise<CustomActivityTemplate | null> => {
    if (!user) {
      console.error('[useCustomActivities] No user found, cannot create template');
      toast.error(t('customActivity.createError'));
      return null;
    }

    try {
      const insertData = {
        user_id: user.id,
        activity_type: data.activity_type,
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        exercises: data.exercises as unknown as Record<string, unknown>[],
        meals: data.meals as unknown as Record<string, unknown>,
        custom_fields: data.custom_fields as unknown as Record<string, unknown>[],
        duration_minutes: data.duration_minutes,
        intensity: data.intensity,
        distance_value: data.distance_value,
        distance_unit: data.distance_unit,
        pace_value: data.pace_value,
        intervals: data.intervals as unknown as Record<string, unknown>[],
        is_favorited: data.is_favorited,
        recurring_days: data.recurring_days as unknown as number[],
        recurring_active: data.recurring_active,
        sport: data.sport,
        embedded_running_sessions: data.embedded_running_sessions as unknown as Record<string, unknown>[] | null,
        display_nickname: data.display_nickname,
        custom_logo_url: data.custom_logo_url,
        reminder_enabled: data.reminder_enabled,
        reminder_time: data.reminder_time,
        display_on_game_plan: data.display_on_game_plan ?? true,
        display_days: data.display_days as unknown as number[],
        display_time: data.display_time,
        specific_dates: data.specific_dates || null,
      };

      console.log('[useCustomActivities] Creating template with data:', {
        title: insertData.title,
        activity_type: insertData.activity_type,
        sport: insertData.sport,
        scheduleForToday
      });
      
      const { data: result, error } = await supabase
        .from('custom_activity_templates')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        console.error('[useCustomActivities] Supabase insert error:', error);
        toast.error(`${t('customActivity.createError')}: ${error.message}`);
        return null;
      }

      if (!result) {
        console.error('[useCustomActivities] No result returned from insert');
        toast.error(t('customActivity.createError'));
        return null;
      }

      const createdTemplate = result as unknown as CustomActivityTemplate;
      console.log('[useCustomActivities] Template created successfully:', createdTemplate.id);

      // If scheduleForToday is true, add to today's game plan BEFORE returning
      if (scheduleForToday) {
        console.log('[useCustomActivities] Adding to today\'s game plan...');
        const today = getTodayDate();
        
        const { error: logError } = await supabase
          .from('custom_activity_logs')
          .insert({
            user_id: user.id,
            template_id: createdTemplate.id,
            entry_date: today,
            completed: false,
          });
          
        if (logError) {
          console.error('[useCustomActivities] Error adding to today:', logError);
          // Don't fail the whole operation, just warn
          toast.warning(t('customActivity.addedButNotScheduled', 'Activity created but could not be added to today'));
        } else {
          console.log('[useCustomActivities] Added to today\'s game plan');
        }
      }

      toast.success(t('customActivity.created'));
      
      // Refresh both templates and today logs
      await Promise.all([fetchTemplates(), fetchTodayLogs()]);
      
      return createdTemplate;
    } catch (error: any) {
      console.error('[useCustomActivities] Unexpected error creating template:', error);
      toast.error(`${t('customActivity.createError')}: ${error?.message || 'Unknown error'}`);
      return null;
    }
  };

  // Update an existing template
  const updateTemplate = async (
    id: string,
    data: Partial<CustomActivityTemplate>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const fieldsToCopy = [
        'title', 'description', 'icon', 'color', 'exercises', 'meals',
        'custom_fields', 'duration_minutes', 'intensity', 'distance_value',
        'distance_unit', 'pace_value', 'intervals', 'is_favorited',
        'is_non_negotiable',
        'recurring_days', 'recurring_active', 'activity_type',
        'embedded_running_sessions', 'display_nickname', 'custom_logo_url',
        'reminder_enabled', 'reminder_time', 'display_on_game_plan',
        'display_days', 'display_time', 'specific_dates'
      ];

      const updateData: Record<string, unknown> = {};
      for (const field of fieldsToCopy) {
        if (field in data) {
          updateData[field] = (data as any)[field] ?? null;
        }
      }

      console.log('[useCustomActivities] Updating template:', id, updateData);
      
      const { error } = await supabase
        .from('custom_activity_templates')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useCustomActivities] Update error:', error);
        toast.error(`${t('customActivity.updateError')}: ${error.message}`);
        return false;
      }

      // Optimistic local update: patch templates immediately
      setTemplates(prev =>
        prev.map(tmpl => tmpl.id === id ? { ...tmpl, ...data } as CustomActivityTemplate : tmpl)
      );

      toast.success(t('customActivity.updated'));
      
      // Broadcast to other tabs (include source to prevent same-tab echo)
      try {
        const bc = new BroadcastChannel('data-sync');
        bc.postMessage({ type: 'custom-activity-updated', templateId: id, source: TAB_ID });
        bc.close();
      } catch {}

      // No delayed fetchTemplates here — GamePlanCard handles the single delayed refresh
      // via refreshCustomActivities(). Local templates are already patched optimistically above.
      
      return true;
    } catch (error: any) {
      console.error('[useCustomActivities] Error updating template:', error);
      toast.error(`${t('customActivity.updateError')}: ${error?.message || 'Unknown error'}`);
      return false;
    }
  };

  // Soft delete a template (moves to Recently Deleted)
  const deleteTemplate = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const { error } = await supabase
        .from('custom_activity_templates')
        .update({
          deleted_at: now.toISOString(),
          deleted_permanently_at: expiresAt.toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('customActivity.movedToTrash', 'Moved to Recently Deleted. You have 30 days to restore it.'));
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error soft-deleting template:', error);
      toast.error(t('customActivity.deleteError'));
      return false;
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (id: string): Promise<boolean> => {
    const template = templates.find(t => t.id === id);
    if (!template) return false;

    return updateTemplate(id, { is_favorited: !template.is_favorited });
  };

  // Add activity to today — idempotent at instance_index = 0.
  // Upsert on UNIQUE (user_id, template_id, entry_date, instance_index) guarantees:
  //   - First call → INSERT
  //   - Repeat call / rapid double-tap → resolves to same canonical row, no duplicates
  //   - Delete + re-add → returns to clean instance 0
  const addToToday = async (templateId: string): Promise<boolean> => {
    if (!user) return false;
    const today = getTodayDate();

    const { data, error } = await supabase
      .from('custom_activity_logs')
      .upsert(
        {
          user_id: user.id,
          template_id: templateId,
          entry_date: today,
          instance_index: 0,
          completed: false,
        } as any,
        {
          onConflict: 'user_id,template_id,entry_date,instance_index',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[useCustomActivities] addToToday upsert failed:', error);
      toast.error(t('customActivity.addError'));
      return false;
    }

    // Merge canonical row into local state, replacing any prior entry for this (template, today).
    setTodayLogs(prev => {
      const filtered = prev.filter(
        l => !(l.template_id === templateId && l.entry_date === today)
      );
      return [...filtered, data as CustomActivityLog];
    });

    toast.success(t('customActivity.addedToday'));
    fetchTodayLogs(); // background reconcile
    return true;
  };

  // Mark activity as complete/incomplete
  // If logId is provided, target that specific log instance; otherwise target the first log for templateId.
  const toggleComplete = async (templateId: string, logId?: string): Promise<boolean> => {
    if (!user) return false;

    const today = getTodayDate();
    const existingLog = logId
      ? todayLogs.find(l => l.id === logId)
      : todayLogs.find(l => l.template_id === templateId);
    const template = templates.find(t => t.id === templateId);

    try {
      const isCompletingNow = !existingLog?.completed;
      
      if (existingLog) {
        // Toggle existing log
        const { error } = await supabase
          .from('custom_activity_logs')
          .update({
            completed: isCompletingNow,
            completed_at: isCompletingNow ? new Date().toISOString() : null,
          })
          .eq('id', existingLog.id);

        if (error) throw error;
      } else {
        // Create new completed log
        const { error } = await supabase
          .from('custom_activity_logs')
          .insert({
            user_id: user.id,
            template_id: templateId,
            entry_date: today,
            completed: true,
            completed_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // When completing (not uncompleting), add exercises to load tracking
      if (isCompletingNow && template?.exercises && template.exercises.length > 0) {
        const activityTypes = ['workout', 'practice', 'short_practice', 'warmup'];
        if (activityTypes.includes(template.activity_type)) {
          try {
            const loadMetrics = calculateCustomActivityLoad(template.exercises);
            if (loadMetrics) {
              // Fire-and-forget load tracking update
              const loadToday = format(new Date(), 'yyyy-MM-dd');
              const { data: existing } = await supabase
                .from('athlete_load_tracking')
                .select('*')
                .eq('user_id', user.id)
                .eq('entry_date', loadToday)
                .maybeSingle();
              
              if (existing) {
                await supabase
                  .from('athlete_load_tracking')
                  .update({
                    cns_load_total: (existing.cns_load_total || 0) + loadMetrics.cnsLoad,
                    volume_load: (existing.volume_load || 0) + loadMetrics.volumeLoad,
                    fascial_load: {
                      compression: ((existing.fascial_load as any)?.compression || 0) + loadMetrics.fascialLoad.compression,
                      elastic: ((existing.fascial_load as any)?.elastic || 0) + loadMetrics.fascialLoad.elastic,
                      glide: ((existing.fascial_load as any)?.glide || 0) + loadMetrics.fascialLoad.glide,
                    },
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);
              } else {
                await supabase
                  .from('athlete_load_tracking')
                  .insert({
                    user_id: user.id,
                    entry_date: loadToday,
                    cns_load_total: loadMetrics.cnsLoad,
                    volume_load: loadMetrics.volumeLoad,
                    fascial_load: loadMetrics.fascialLoad,
                  });
              }
              console.log(`[useCustomActivities] Added load for "${template.title}": CNS=${loadMetrics.cnsLoad}, Vol=${loadMetrics.volumeLoad}`);
            }
          } catch (loadError) {
            console.warn('[useCustomActivities] Load tracking update failed (non-blocking):', loadError);
          }
        }
      }

      await fetchTodayLogs();
      return true;
    } catch (error) {
      console.error('Error toggling complete:', error);
      return false;
    }
  };

  // Remove activity from today (specific instance if logId provided).
  // Optimistic local purge → instant UI feedback, rollback on failure.
  const removeFromToday = async (templateId: string, logId?: string): Promise<boolean> => {
    if (!user) return false;

    const log = logId
      ? todayLogs.find(l => l.id === logId)
      : todayLogs.find(l => l.template_id === templateId);
    if (!log) return false;

    // Optimistic removal
    setTodayLogs(prev => prev.filter(l => l.id !== log.id));

    const { error } = await supabase
      .from('custom_activity_logs')
      .delete()
      .eq('id', log.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing from today:', error);
      // Roll back
      setTodayLogs(prev => [...prev, log]);
      toast.error(t('customActivity.deleteError'));
      return false;
    }

    fetchTodayLogs(); // background reconcile
    return true;
  };

  // Update log performance data (for daily checkbox states, etc.)
  const updateLogPerformanceData = async (
    logId: string,
    performanceData: Record<string, any>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_logs')
        .update({ performance_data: performanceData })
        .eq('id', logId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useCustomActivities] Error updating performance data:', error);
        return false;
      }

      await fetchTodayLogs();
      return true;
    } catch (error) {
      console.error('[useCustomActivities] Error updating performance data:', error);
      return false;
    }
  };

  // Ensure a log exists for a template and return it directly (avoids stale closure)
  // If logId is provided AND that log exists, return it directly without inserting.
  const ensureLogExists = async (templateId: string, logId?: string): Promise<CustomActivityLog | null> => {
    if (!user) return null;

    if (logId) {
      const existing = todayLogs.find(l => l.id === logId);
      if (existing) return existing;
    }

    const today = getTodayDate();

    try {
      // Look for an existing log (instance 0 preferred) for this template/today
      const { data: existingRows, error: selErr } = await supabase
        .from('custom_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('template_id', templateId)
        .eq('entry_date', today)
        .order('instance_index', { ascending: true })
        .limit(1);

      if (selErr) throw selErr;
      if (existingRows && existingRows.length > 0) {
        // Refresh state in background
        fetchTodayLogs();
        return existingRows[0] as CustomActivityLog;
      }

      // None exists — insert at instance_index 0
      const { data, error } = await supabase
        .from('custom_activity_logs')
        .insert({
          user_id: user.id,
          template_id: templateId,
          entry_date: today,
          completed: false,
          instance_index: 0,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('[useCustomActivities] Error ensuring log exists:', error);
        return null;
      }

      // Refresh state in background (non-blocking)
      fetchTodayLogs();

      return data as CustomActivityLog;
    } catch (error) {
      console.error('[useCustomActivities] Error ensuring log exists:', error);
      return null;
    }
  };

  // Update template schedule settings (display days, time, reminder)
  const updateTemplateSchedule = async (
    templateId: string,
    displayDays: number[],
    displayTime: string | null,
    reminderEnabled: boolean,
    reminderMinutes: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_templates')
        .update({
          display_days: displayDays,
          display_time: displayTime,
          reminder_enabled: reminderEnabled,
          reminder_minutes: reminderMinutes,
          // Also update recurring_days to keep them in sync
          recurring_days: displayDays,
          recurring_active: displayDays.length > 0,
        })
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useCustomActivities] Error updating template schedule:', error);
        toast.error(t('customActivity.updateError'));
        return false;
      }

      toast.success(t('customActivity.scheduleUpdated', 'Schedule updated'));
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('[useCustomActivities] Error updating template schedule:', error);
      toast.error(t('customActivity.updateError'));
      return false;
    }
  };

  // === NEW: explicit completion state mutators (intent-based) ===

  // Single-point write for completion_state + completion_method
  const setCompletionState = async (
    templateId: string,
    state: CompletionState,
    method: CompletionMethod,
    logId?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Ensure log exists (target specific instance if logId provided), then update
      const log = await ensureLogExists(templateId, logId);
      if (!log) return false;

      const updates: Record<string, any> = {
        completion_state: state,
        completion_method: method,
      };
      // Trigger will mirror `completed` from completion_state, but set explicitly for older readers
      updates.completed = state === 'completed';
      updates.completed_at = state === 'completed' ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('custom_activity_logs')
        .update(updates)
        .eq('id', log.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useCustomActivities] setCompletionState error:', error);
        return false;
      }

      // Optimistic local update — no refetch (race-free)
      setTodayLogs(prev => prev.map(l =>
        l.id === log.id
          ? { ...l, completion_state: state, completion_method: method, completed: state === 'completed' }
          : l
      ));

      return true;
    } catch (error) {
      console.error('[useCustomActivities] setCompletionState error:', error);
      return false;
    }
  };

  // Mark all checkboxes true + complete (Check all & complete)
  const markAllCheckboxesAndComplete = async (
    templateId: string,
    allCheckableIds: string[],
    logId?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const log = await ensureLogExists(templateId, logId);
      if (!log) return false;

      const currentPd = (log.performance_data as Record<string, any>) || {};
      const currentStates = (currentPd.checkboxStates as Record<string, boolean>) || {};
      const newStates: Record<string, boolean> = { ...currentStates };
      allCheckableIds.forEach(id => { newStates[id] = true; });

      const newPd = { ...currentPd, checkboxStates: newStates };

      const { error } = await supabase
        .from('custom_activity_logs')
        .update({
          performance_data: newPd,
          completion_state: 'completed',
          completion_method: 'check_all',
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', log.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[useCustomActivities] markAllCheckboxesAndComplete error:', error);
        return false;
      }

      // Optimistic local update — no refetch (race-free)
      setTodayLogs(prev => prev.map(l =>
        l.id === log.id
          ? { ...l, performance_data: newPd, completion_state: 'completed', completion_method: 'check_all', completed: true }
          : l
      ));

      return true;
    } catch (error) {
      console.error('[useCustomActivities] markAllCheckboxesAndComplete error:', error);
      return false;
    }
  };

  // Reopen a completed activity → in_progress (or not_started if nothing checked)
  const reopenActivity = async (templateId: string, logId?: string): Promise<boolean> => {
    if (!user) return false;
    const log = logId
      ? todayLogs.find(l => l.id === logId)
      : todayLogs.find(l => l.template_id === templateId);
    const pd = (log?.performance_data as Record<string, any>) || {};
    const states = (pd.checkboxStates as Record<string, boolean>) || {};
    const anyChecked = Object.values(states).some(v => v === true);
    return setCompletionState(templateId, anyChecked ? 'in_progress' : 'not_started', 'none', logId);
  };

  return {
    templates,
    todayLogs,
    loading,
    getTodayActivities,
    getFavorites,
    createTemplate,
    updateTemplate,
    updateTemplateSchedule,
    deleteTemplate,
    toggleFavorite,
    addToToday,
    toggleComplete,
    removeFromToday,
    updateLogPerformanceData,
    ensureLogExists,
    setCompletionState,
    markAllCheckboxesAndComplete,
    reopenActivity,
    refetch: fetchAll,
  };
}
