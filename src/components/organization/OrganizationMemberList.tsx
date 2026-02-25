import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function OrganizationMemberList() {
  const { members } = useOrganization();
  const memberList = members.data ?? [];
  const userIds = memberList.map((m: any) => m.user_id);

  // Fetch profile names from profiles_public view
  const { data: profiles } = useQuery({
    queryKey: ['member-profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase
        .from('profiles_public')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      if (!data) return {};
      return Object.fromEntries(data.map(p => [p.id, p]));
    },
    enabled: userIds.length > 0,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Members ({memberList.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : memberList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {memberList.map((m: any) => {
              const profile = profiles?.[m.user_id];
              const displayName = profile?.full_name || 'Unknown Player';
              const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role_in_org}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
