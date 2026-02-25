import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityFolder, ActivityFolderItem } from '@/types/activityFolder';
import { toast } from 'sonner';

export function useFolderTemplates(sport: string) {
  const [templates, setTemplates] = useState<ActivityFolder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async (category?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_folders')
        .select('*')
        .eq('is_template', true)
        .eq('status', 'active')
        .eq('sport', sport)
        .order('use_count', { ascending: false });

      if (category) {
        query = query.eq('template_category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data || []) as unknown as ActivityFolder[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  const duplicateTemplate = async (templateId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // Fetch the template folder
      const { data: tmpl, error: tmplErr } = await supabase
        .from('activity_folders')
        .select('*')
        .eq('id', templateId)
        .single();
      if (tmplErr || !tmpl) throw tmplErr;

      // Fetch template items
      const { data: items, error: itemsErr } = await supabase
        .from('activity_folder_items')
        .select('*')
        .eq('folder_id', templateId)
        .order('order_index');
      if (itemsErr) throw itemsErr;

      // Create new folder (deep copy)
      const { data: newFolder, error: createErr } = await supabase
        .from('activity_folders')
        .insert({
          name: tmpl.name,
          description: tmpl.description,
          label: tmpl.label,
          sport: tmpl.sport,
          start_date: null,
          end_date: null,
          frequency_days: tmpl.frequency_days,
          cycle_type: tmpl.cycle_type,
          cycle_length_weeks: tmpl.cycle_length_weeks,
          placement: tmpl.placement,
          color: tmpl.color,
          icon: tmpl.icon,
          owner_id: userData.user.id,
          owner_type: 'coach',
          status: 'draft',
          priority_level: tmpl.priority_level,
          is_template: false,
          source_template_id: templateId,
        } as any)
        .select()
        .single();
      if (createErr) throw createErr;

      // Copy items
      if (items && items.length > 0) {
        const newItems = items.map((item: any) => ({
          folder_id: (newFolder as any).id,
          title: item.title,
          description: item.description,
          item_type: item.item_type,
          assigned_days: item.assigned_days,
          cycle_week: item.cycle_week,
          order_index: item.order_index,
          duration_minutes: item.duration_minutes,
          notes: item.notes,
          completion_tracking: item.completion_tracking,
          exercises: item.exercises,
          attachments: item.attachments,
          specific_dates: item.specific_dates,
        }));

        await supabase.from('activity_folder_items').insert(newItems as any);
      }

      // Increment use_count on the source template
      await supabase
        .from('activity_folders')
        .update({ use_count: (tmpl.use_count || 0) + 1 } as any)
        .eq('id', templateId);

      toast.success('Template duplicated into your folders');
      return newFolder as unknown as ActivityFolder;
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
      return null;
    }
  };

  const publishAsTemplate = async (folderId: string, category: string, description: string) => {
    try {
      const { error } = await supabase
        .from('activity_folders')
        .update({
          is_template: true,
          template_category: category,
          template_description: description,
        } as any)
        .eq('id', folderId);
      if (error) throw error;
      toast.success('Folder published as template');
    } catch (error) {
      console.error('Error publishing template:', error);
      toast.error('Failed to publish template');
    }
  };

  const unpublishTemplate = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('activity_folders')
        .update({
          is_template: false,
          template_category: null,
          template_description: null,
        } as any)
        .eq('id', folderId);
      if (error) throw error;
      toast.success('Template unpublished');
    } catch (error) {
      console.error('Error unpublishing template:', error);
      toast.error('Failed to unpublish template');
    }
  };

  return {
    templates,
    loading,
    fetchTemplates,
    duplicateTemplate,
    publishAsTemplate,
    unpublishTemplate,
  };
}
