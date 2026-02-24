import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import { Users } from 'lucide-react';

export function OrganizationMemberList() {
  const { members } = useOrganization();
  const memberList = members.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Members ({memberList.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {memberList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {memberList.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <p className="font-medium">{m.user_id}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.role_in_org}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
