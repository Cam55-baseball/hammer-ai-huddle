import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomActivityTemplate } from '@/types/customActivity';
import { LockableField, FollowedPlayer } from '@/types/sentActivity';
import { computeScheduleDates, type ScheduleInput } from '@/lib/coachRx/schedule';
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

      // Org admins/coaches can also send to their assigned athletes
      // (owner request Oct 24, run 6) — same send path, same per-player safety.
      const { data: assignments, error: assignmentsError } = await supabase
        .from('org_athlete_assignments' as any)
        .select('athlete_user_id')
        .eq('coach_user_id', userData.user.id)
        .is('revoked_at', null);

      if (assignmentsError) throw assignmentsError;

      const assignedIds = ((assignments ?? []) as any[]).map((a) => a.athlete_user_id as string);
      const followIds = (follows ?? []).map((f) => f.player_id);
      const allIds = [...new Set([...followIds, ...assignedIds])];

      if (allIds.length > 0) {
        const playerIds = allIds;
        
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
    message?: string,
    rxOptions?: { category: string; planDate: string; schedule?: ScheduleInput }
  ): Promise<boolean> => {
    if (playerIds.length === 0) {
      toast.error(t('sentActivity.selectPlayer', 'Please select at least one player'));
      return false;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const senderId = userData.user.id;

      // Create a snapshot of the template as JSON
      const templateSnapshot = JSON.parse(JSON.stringify(template));

      // Insert sent activity records for each player
      const inserts = playerIds.map(playerId => ({
        sender_id: senderId,
        template_id: template.id,
        template_snapshot: templateSnapshot,
        recipient_id: playerId,
        locked_fields: lockedFields as string[],
        message: message || null,
        status: 'pending'
      }));

      // Coach prescription (owner request Oct 24): one row per player per
      // scheduled day so each player gets their own Today choice and their own
      // safety check on every day. Schedule shapes: any day (one undated card
      // the player activates), specific date(s), or a recurring series
      // materialized day by day with a shared series id.
      if (rxOptions) {
        const teamSendId = playerIds.length > 1 ? crypto.randomUUID() : null;
        const schedule: ScheduleInput = rxOptions.schedule ?? { type: 'date', startDate: rxOptions.planDate };
        const today = new Date().toLocaleDateString('en-CA');
        const days = schedule.type === 'any_day'
          ? [rxOptions.planDate] // anchor only; the player picks the real day
          : computeScheduleDates(schedule, today);
        if (days.length === 0) {
          toast.error(t('sentActivity.sendError', 'Failed to send activity'));
          return false;
        }
        const seriesId = (days.length > 1 || schedule.type === 'recurring') ? crypto.randomUUID() : null;
        const scheduleMeta = {
          schedule_type: schedule.type,
          series_id: seriesId,
          recur_weekdays: schedule.weekdays ?? null,
          recur_every_weeks: schedule.everyWeeks ?? null,
          recur_monthly_ordinal: schedule.monthlyOrdinal ?? null,
          recur_monthly_weekday: schedule.monthlyWeekday ?? null,
          recur_end: schedule.endDate ?? null,
          recur_count: schedule.count ?? null,
        };
        const rxRows = playerIds.flatMap(playerId =>
          days.map(day => ({
            sender_id: senderId,
            recipient_id: playerId,
            category: rxOptions.category,
            plan_date: day,
            title: template.title,
            exercises: templateSnapshot.exercises ?? [],
            gear_labels: (templateSnapshot.exercises ?? []).flatMap((e: any) => e?.gear ? [String(e.gear)] : []),
            source_template_id: template.id,
            team_send_id: teamSendId,
            safety_result: { intensity: template.intensity ?? 'standard' },
            ...scheduleMeta,
          }))
        );
        const { error: rxError } = await supabase.from('coach_prescriptions' as any).insert(rxRows);
        if (rxError) {
          toast.error(t('sentActivity.sendError', 'Failed to send activity'));
          return false;
        }
        // A prescription is the one received card. Do not also create a
        // legacy acceptance invitation or leave one behind on a failed send.
        toast.success(t('sentActivity.sent', `Activity sent to ${playerIds.length} player(s)!`));
        return true;
      }

      const { error } = await supabase.from('sent_activity_templates').insert(inserts);
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
