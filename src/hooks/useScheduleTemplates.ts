import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface ScheduleItem {
  taskId: string;
  startTime: string | null; // "HH:mm" format
  reminderMinutes: number | null; // 5, 10, 15, or 20
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  schedule: ScheduleItem[];
  is_default: boolean;
  created_at: string;
}

export function useScheduleTemplates() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('timeline_schedule_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTemplates((data || []).map(d => ({
        id: d.id,
        name: d.name,
        schedule: (Array.isArray(d.schedule) ? d.schedule : []) as unknown as ScheduleItem[],
        is_default: d.is_default || false,
        created_at: d.created_at || '',
      })));
    } catch (error) {
      console.error('Error fetching schedule templates:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = useCallback(async (
    name: string, 
    schedule: ScheduleItem[], 
    isDefault: boolean = false
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // If setting as default, first unset any existing defaults
      if (isDefault) {
        await supabase
          .from('timeline_schedule_templates')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('timeline_schedule_templates')
        .insert({
          user_id: user.id,
          name,
          schedule: schedule as any,
          is_default: isDefault,
        });

      if (error) throw error;

      toast.success(t('gamePlan.scheduleTemplate.savedSuccess'));
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error saving schedule template:', error);
      toast.error(t('common.error'));
      return false;
    }
  }, [user, fetchTemplates, t]);

  const updateTemplate = useCallback(async (
    templateId: string,
    updates: Partial<{ name: string; schedule: ScheduleItem[]; is_default: boolean }>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // If setting as default, first unset any existing defaults
      if (updates.is_default) {
        await supabase
          .from('timeline_schedule_templates')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('timeline_schedule_templates')
        .update({
          ...updates,
          schedule: updates.schedule as any,
        })
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error updating schedule template:', error);
      toast.error(t('common.error'));
      return false;
    }
  }, [user, fetchTemplates, t]);

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('timeline_schedule_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('gamePlan.scheduleTemplate.deleteSuccess'));
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error('Error deleting schedule template:', error);
      toast.error(t('common.error'));
      return false;
    }
  }, [user, fetchTemplates, t]);

  const getDefaultTemplate = useCallback((): ScheduleTemplate | null => {
    return templates.find(t => t.is_default) || null;
  }, [templates]);

  return {
    templates,
    loading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    getDefaultTemplate,
    refetch: fetchTemplates,
  };
}
