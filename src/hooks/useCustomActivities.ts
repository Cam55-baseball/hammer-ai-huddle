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
  RunningInterval
} from '@/types/customActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useCustomActivities(selectedSport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<CustomActivityTemplate[]>([]);
  const [todayLogs, setTodayLogs] = useState<CustomActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
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
      setTodayLogs((data || []) as CustomActivityLog[]);
    } catch (error) {
      console.error('Error fetching today logs:', error);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchTodayLogs()]);
    setLoading(false);
  }, [fetchTemplates, fetchTodayLogs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
      
      // Set flag to notify Game Plan to refresh
      localStorage.setItem('customActivityCreated', Date.now().toString());
      
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
      const updateData: Record<string, unknown> = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.exercises !== undefined) updateData.exercises = data.exercises;
      if (data.meals !== undefined) updateData.meals = data.meals;
      if (data.custom_fields !== undefined) updateData.custom_fields = data.custom_fields;
      if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes;
      if (data.intensity !== undefined) updateData.intensity = data.intensity;
      if (data.distance_value !== undefined) updateData.distance_value = data.distance_value;
      if (data.distance_unit !== undefined) updateData.distance_unit = data.distance_unit;
      if (data.pace_value !== undefined) updateData.pace_value = data.pace_value;
      if (data.intervals !== undefined) updateData.intervals = data.intervals;
      if (data.is_favorited !== undefined) updateData.is_favorited = data.is_favorited;
      if (data.recurring_days !== undefined) updateData.recurring_days = data.recurring_days;
      if (data.recurring_active !== undefined) updateData.recurring_active = data.recurring_active;
      if (data.activity_type !== undefined) updateData.activity_type = data.activity_type;
      // Add missing fields
      if (data.embedded_running_sessions !== undefined) updateData.embedded_running_sessions = data.embedded_running_sessions;
      if (data.display_nickname !== undefined) updateData.display_nickname = data.display_nickname;
      if (data.custom_logo_url !== undefined) updateData.custom_logo_url = data.custom_logo_url;
      if (data.reminder_enabled !== undefined) updateData.reminder_enabled = data.reminder_enabled;
      if (data.reminder_time !== undefined) updateData.reminder_time = data.reminder_time;

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

      toast.success(t('customActivity.updated'));
      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error('[useCustomActivities] Error updating template:', error);
      toast.error(`${t('customActivity.updateError')}: ${error?.message || 'Unknown error'}`);
      return false;
    }
  };

  // Delete a template
  const deleteTemplate = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('customActivity.deleted'));
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
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

  // Add activity to today (create log entry)
  const addToToday = async (templateId: string): Promise<boolean> => {
    if (!user) return false;

    const today = getTodayDate();
    
    try {
      const { error } = await supabase
        .from('custom_activity_logs')
        .upsert({
          user_id: user.id,
          template_id: templateId,
          entry_date: today,
          completed: false,
        }, {
          onConflict: 'user_id,template_id,entry_date'
        });

      if (error) throw error;

      toast.success(t('customActivity.addedToday'));
      await fetchTodayLogs();
      return true;
    } catch (error) {
      console.error('Error adding to today:', error);
      toast.error(t('customActivity.addError'));
      return false;
    }
  };

  // Mark activity as complete/incomplete
  const toggleComplete = async (templateId: string): Promise<boolean> => {
    if (!user) return false;

    const today = getTodayDate();
    const existingLog = todayLogs.find(l => l.template_id === templateId);

    try {
      if (existingLog) {
        // Toggle existing log
        const { error } = await supabase
          .from('custom_activity_logs')
          .update({
            completed: !existingLog.completed,
            completed_at: !existingLog.completed ? new Date().toISOString() : null,
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

      await fetchTodayLogs();
      return true;
    } catch (error) {
      console.error('Error toggling complete:', error);
      return false;
    }
  };

  // Remove activity from today
  const removeFromToday = async (templateId: string): Promise<boolean> => {
    if (!user) return false;

    const log = todayLogs.find(l => l.template_id === templateId);
    if (!log) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_logs')
        .delete()
        .eq('id', log.id);

      if (error) throw error;

      await fetchTodayLogs();
      return true;
    } catch (error) {
      console.error('Error removing from today:', error);
      return false;
    }
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

  return {
    templates,
    todayLogs,
    loading,
    getTodayActivities,
    getFavorites,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    addToToday,
    toggleComplete,
    removeFromToday,
    updateLogPerformanceData,
    refetch: fetchAll,
  };
}
