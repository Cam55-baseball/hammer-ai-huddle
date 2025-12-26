import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomActivityTemplate } from '@/types/customActivity';
import { LockableField, FollowedPlayer } from '@/types/sentActivity';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useSentActivities() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [followedPlayers, setFollowedPlayers] = useState<FollowedPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const fetchFollowedPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get players the scout is following (accepted connections only)
      const { data: follows, error: followsError } = await supabase
        .from('scout_follows')
        .select('player_id')
        .eq('scout_id', userData.user.id)
        .eq('status', 'accepted');

      if (followsError) throw followsError;

      if (follows && follows.length > 0) {
        const playerIds = follows.map(f => f.player_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, position')
          .in('id', playerIds);

        if (profilesError) throw profilesError;

        setFollowedPlayers(profiles || []);
      } else {
        setFollowedPlayers([]);
      }
    } catch (error) {
      console.error('Error fetching followed players:', error);
      toast.error(t('sentActivity.fetchPlayersError', 'Failed to load players'));
    } finally {
      setLoadingPlayers(false);
    }
  }, [t]);

  const sendActivityToPlayers = async (
    template: CustomActivityTemplate,
    playerIds: string[],
    lockedFields: LockableField[],
    message?: string
  ): Promise<boolean> => {
    if (playerIds.length === 0) {
      toast.error(t('sentActivity.selectPlayer', 'Please select at least one player'));
      return false;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create a snapshot of the template as JSON
      const templateSnapshot = JSON.parse(JSON.stringify(template));

      // Insert sent activity records for each player
      const inserts = playerIds.map(playerId => ({
        sender_id: userData.user!.id,
        template_id: template.id,
        template_snapshot: templateSnapshot,
        recipient_id: playerId,
        locked_fields: lockedFields as string[],
        message: message || null,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('sent_activity_templates')
        .insert(inserts);

      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
          toast.error(t('sentActivity.alreadySent', 'This activity was already sent to one or more selected players'));
          return false;
        }
        throw error;
      }

      toast.success(t('sentActivity.sent', `Activity sent to ${playerIds.length} player(s)!`));
      return true;
    } catch (error) {
      console.error('Error sending activity:', error);
      toast.error(t('sentActivity.sendError', 'Failed to send activity'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    loadingPlayers,
    followedPlayers,
    fetchFollowedPlayers,
    sendActivityToPlayers
  };
}
