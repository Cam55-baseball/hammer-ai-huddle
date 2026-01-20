import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface SentActivityRecord {
  id: string;
  sender_id: string;
  recipient_id: string;
  template_id: string;
  template_snapshot: {
    id: string;
    title: string;
    icon: string;
    color: string;
    activity_type: string;
    custom_logo_url?: string;
  };
  locked_fields: string[];
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  sent_at: string;
  responded_at: string | null;
  recipient?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export function useSentActivitiesHistory() {
  const { t } = useTranslation();
  const [sentActivities, setSentActivities] = useState<SentActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const fetchSentActivities = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('sent_activity_templates')
        .select(`
          id,
          sender_id,
          recipient_id,
          template_id,
          template_snapshot,
          locked_fields,
          message,
          status,
          sent_at,
          responded_at
        `)
        .eq('sender_id', userData.user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Get recipient profiles
      if (data && data.length > 0) {
        const recipientIds = [...new Set(data.map(d => d.recipient_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', recipientIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedData = data.map(item => ({
          ...item,
          template_snapshot: item.template_snapshot as SentActivityRecord['template_snapshot'],
          status: item.status as SentActivityRecord['status'],
          recipient: profileMap.get(item.recipient_id) || undefined
        }));

        setSentActivities(enrichedData);
      } else {
        setSentActivities([]);
      }
    } catch (error) {
      console.error('Error fetching sent activities:', error);
      toast.error(t('sentActivity.fetchError', 'Failed to load sent activities'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const filteredActivities = sentActivities.filter(activity => {
    if (statusFilter === 'all') return true;
    return activity.status === statusFilter;
  });

  return {
    sentActivities: filteredActivities,
    allActivities: sentActivities,
    loading,
    statusFilter,
    setStatusFilter,
    fetchSentActivities
  };
}
