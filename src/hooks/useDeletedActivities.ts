import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CustomActivityTemplate, 
  Exercise,
  MealData,
  CustomField,
  RunningInterval
} from '@/types/customActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useDeletedActivities(selectedSport: 'baseball' | 'softball') {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [deletedTemplates, setDeletedTemplates] = useState<CustomActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeletedTemplates = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_activity_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

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

      setDeletedTemplates(parsed);
    } catch (error) {
      console.error('Error fetching deleted templates:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedSport]);

  useEffect(() => {
    fetchDeletedTemplates();
  }, [fetchDeletedTemplates]);

  // Restore a soft-deleted template
  const restoreTemplate = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_templates')
        .update({
          deleted_at: null,
          deleted_permanently_at: null
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('customActivity.restored', 'Activity restored successfully'));
      await fetchDeletedTemplates();
      return true;
    } catch (error) {
      console.error('Error restoring template:', error);
      toast.error(t('customActivity.restoreError', 'Failed to restore activity'));
      return false;
    }
  };

  // Permanently delete a template
  const permanentlyDeleteTemplate = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_templates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('customActivity.permanentlyDeleted', 'Activity permanently deleted'));
      await fetchDeletedTemplates();
      return true;
    } catch (error) {
      console.error('Error permanently deleting template:', error);
      toast.error(t('customActivity.deleteError', 'Failed to delete activity'));
      return false;
    }
  };

  // Empty all deleted templates (permanently delete all)
  const emptyTrash = async (): Promise<boolean> => {
    if (!user || deletedTemplates.length === 0) return false;

    try {
      const { error } = await supabase
        .from('custom_activity_templates')
        .delete()
        .eq('user_id', user.id)
        .eq('sport', selectedSport)
        .not('deleted_at', 'is', null);

      if (error) throw error;

      toast.success(t('customActivity.trashEmptied', 'All deleted activities permanently removed'));
      await fetchDeletedTemplates();
      return true;
    } catch (error) {
      console.error('Error emptying trash:', error);
      toast.error(t('customActivity.emptyTrashError', 'Failed to empty trash'));
      return false;
    }
  };

  // Calculate days remaining before permanent deletion
  const getDaysRemaining = (deletedPermanentlyAt: string | null | undefined): number => {
    if (!deletedPermanentlyAt) return 30;
    const expiryDate = new Date(deletedPermanentlyAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return {
    deletedTemplates,
    loading,
    deletedCount: deletedTemplates.length,
    restoreTemplate,
    permanentlyDeleteTemplate,
    emptyTrash,
    getDaysRemaining,
    refetch: fetchDeletedTemplates
  };
}
