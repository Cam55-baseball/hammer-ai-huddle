import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SentActivityTemplate, LockableField } from '@/types/sentActivity';
import { CustomActivityTemplate } from '@/types/customActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useReceivedActivities() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<SentActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('sent_activity_templates')
        .select('*')
        .eq('recipient_id', userData.user.id)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles and roles
      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map(a => a.sender_id))];
        
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', senderIds);

        // Fetch ALL sender roles (don't filter by role type - this was causing coach roles to be missed)
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role, status')
          .in('user_id', senderIds)
          .eq('status', 'active');

        if (rolesError) {
          console.error('[useReceivedActivities] Error fetching roles:', rolesError);
        }

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const roleMap = new Map<string, 'scout' | 'coach'>();
        
        // Build role map - coach takes priority over scout
        // Iterate through all roles and prioritize coach > scout
        roles?.forEach(r => {
          const roleValue = r.role as string;
          if (roleValue === 'coach') {
            // Coach always takes priority - overwrite any existing
            roleMap.set(r.user_id, 'coach');
          } else if (roleValue === 'scout') {
            // Only set scout if user doesn't already have coach role
            if (!roleMap.has(r.user_id)) {
              roleMap.set(r.user_id, 'scout');
            }
          }
        });
        
        // Debug logging to verify role assignment
        console.log('[useReceivedActivities] Roles fetched:', roles?.length, 'Role map:', Object.fromEntries(roleMap));

        const enrichedActivities: SentActivityTemplate[] = data.map(activity => {
          const profile = profileMap.get(activity.sender_id);
          const role = roleMap.get(activity.sender_id) || 'scout'; // Default to scout
          
          return {
            ...activity,
            template_snapshot: activity.template_snapshot as unknown as CustomActivityTemplate,
            locked_fields: (activity.locked_fields || []) as LockableField[],
            status: activity.status as 'pending' | 'accepted' | 'rejected',
            sender: {
              full_name: profile?.full_name || 'Unknown',
              avatar_url: profile?.avatar_url || null,
              role: role
            }
          };
        });

        setActivities(enrichedActivities);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching received activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    // Set up realtime subscription
    const setupSubscription = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const channel = supabase
        .channel('received-activities')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sent_activity_templates',
            filter: `recipient_id=eq.${userData.user.id}`
          },
          () => {
            fetchActivities();
            toast.info(t('sentActivity.newActivityReceived', 'New activity received!'));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [fetchActivities, t]);

  const acceptActivity = async (
    activityId: string, 
    createTemplate: (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<CustomActivityTemplate | null>
  ): Promise<CustomActivityTemplate | null> => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return null;

    try {
      // Create a copy of the template for the player
      const { id, user_id, created_at, updated_at, ...templateData } = activity.template_snapshot;
      
      // Ensure the template shows on game plan immediately
      const todayDayOfWeek = new Date().getDay();
      
      // Use template's display_days if set, otherwise default to today
      const effectiveDisplayDays = templateData.display_days?.length 
        ? templateData.display_days 
        : [todayDayOfWeek];
      
      // Sync recurring_days to display_days for E2E visibility on Game Plan & Calendar
      const effectiveRecurringDays = templateData.recurring_days?.length 
        ? templateData.recurring_days 
        : effectiveDisplayDays;
      
      const enhancedData = {
        ...templateData,
        display_on_game_plan: true,
        display_days: effectiveDisplayDays,
        recurring_days: effectiveRecurringDays,
        // Critical: Must be true for activity to show on Game Plan
        recurring_active: true,
      };
      
      const newTemplate = await createTemplate(enhancedData);
      if (!newTemplate) return null;

      // Update the sent activity status
      const { error } = await supabase
        .from('sent_activity_templates')
        .update({
          status: 'accepted',
          accepted_template_id: newTemplate.id,
          responded_at: new Date().toISOString()
        })
        .eq('id', activityId);

      if (error) throw error;

      await fetchActivities();
      toast.success(t('sentActivity.acceptedSuccess', 'Activity accepted and added to your Game Plan!'), {
        description: t('sentActivity.acceptedSuccessHint', 'It will now appear in your daily tasks.')
      });
      return newTemplate;
    } catch (error) {
      console.error('Error accepting activity:', error);
      toast.error(t('sentActivity.acceptError', 'Failed to accept activity'));
      return null;
    }
  };

  const rejectActivity = async (activityId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sent_activity_templates')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', activityId);

      if (error) throw error;

      await fetchActivities();
      toast.success(t('sentActivity.rejected', 'Activity rejected'));
      return true;
    } catch (error) {
      console.error('Error rejecting activity:', error);
      toast.error(t('sentActivity.rejectError', 'Failed to reject activity'));
      return false;
    }
  };

  const pendingActivities = activities.filter(a => a.status === 'pending');
  const historyActivities = activities.filter(a => a.status !== 'pending');
  const pendingCount = pendingActivities.length;

  return {
    activities,
    pendingActivities,
    historyActivities,
    pendingCount,
    loading,
    acceptActivity,
    rejectActivity,
    refetch: fetchActivities
  };
}
