import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerOrganization } from '@/hooks/usePlayerOrganization';

export interface PoolPlayer {
  id: string;
  name: string;
  position: string | null;
  avatar_url: string | null;
  source: 'linked' | 'roster' | 'both';
}

export function useCoachPlayerPool() {
  const { user } = useAuth();
  const { organizationId } = usePlayerOrganization();

  return useQuery({
    queryKey: ['coach-player-pool', user?.id, organizationId],
    queryFn: async (): Promise<PoolPlayer[]> => {
      if (!user) return [];

      const playerMap = new Map<string, PoolPlayer>();

      // 1. Linked players from scout_follows
      const { data: linked } = await supabase
        .from('scout_follows')
        .select('player_id, profiles_public!scout_follows_player_id_fkey(id, full_name, position, avatar_url)')
        .eq('scout_id', user.id)
        .eq('status', 'accepted')
        .eq('relationship_type', 'linked');

      if (linked) {
        for (const row of linked) {
          const p = row.profiles_public as any;
          if (!p?.id) continue;
          playerMap.set(p.id, {
            id: p.id,
            name: p.full_name ?? 'Unknown',
            position: p.position ?? null,
            avatar_url: p.avatar_url ?? null,
            source: 'linked',
          });
        }
      }

      // 2. Organization roster
      if (organizationId) {
        const { data: members } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .neq('user_id', user.id);

        if (members && members.length > 0) {
          const memberIds = members.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles_public')
            .select('id, full_name, position, avatar_url')
            .in('id', memberIds);

          if (profiles) {
            for (const p of profiles) {
              if (!p.id) continue;
              const existing = playerMap.get(p.id);
              if (existing) {
                existing.source = 'both';
              } else {
                playerMap.set(p.id, {
                  id: p.id,
                  name: p.full_name ?? 'Unknown',
                  position: p.position ?? null,
                  avatar_url: p.avatar_url ?? null,
                  source: 'roster',
                });
              }
            }
          }
        }
      }

      return Array.from(playerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user,
  });
}
