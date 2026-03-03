import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { usePlayerOrganization } from '@/hooks/usePlayerOrganization';
import { PlayerOrganizationView } from '@/components/organization/PlayerOrganizationView';
import { useTeamStats } from '@/hooks/useTeamStats';
import { OrganizationRegistration } from '@/components/organization/OrganizationRegistration';
import { OrganizationMemberList } from '@/components/organization/OrganizationMemberList';
import { TeamComplianceCard } from '@/components/organization/TeamComplianceCard';
import { TeamRosterView } from '@/components/organization/TeamRosterView';
import { TeamHeatMapOverlay } from '@/components/organization/TeamHeatMapOverlay';
import { InviteCodeCard } from '@/components/organization/InviteCodeCard';
import { JoinOrganization } from '@/components/organization/JoinOrganization';
import { TeamAnnouncements } from '@/components/organization/TeamAnnouncements';
import { Building2 } from 'lucide-react';

export default function OrganizationDashboard() {
  const { myOrgs, members } = useOrganization();
  const { membership, organizationId, roleInOrg, orgName } = usePlayerOrganization();
  const activeOrg = myOrgs.data?.[0];
  const memberList = members.data ?? [];
  const isOwnerOrCoach = !!activeOrg;
  const { data: teamStats } = useTeamStats(activeOrg?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Organization Dashboard
          </h1>
          <p className="text-muted-foreground">Manage your team, track compliance, and view aggregated analytics.</p>
        </div>

        {activeOrg ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invite">Invite</TabsTrigger>
              <TabsTrigger value="heatmaps">Heat Maps</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <TeamComplianceCard
                avgIntegrity={teamStats?.avgIntegrity ?? 0}
                coachValidationPct={teamStats?.coachValidationPct ?? 0}
                activeMemberCount={teamStats?.activeMemberCount ?? memberList.length}
                flaggedCount={teamStats?.flaggedCount ?? 0}
              />
            </TabsContent>

            <TabsContent value="announcements">
              <TeamAnnouncements orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="roster">
              <TeamRosterView orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="members">
              <OrganizationMemberList />
            </TabsContent>

            <TabsContent value="invite">
              <InviteCodeCard orgId={activeOrg.id} existingCode={activeOrg.invite_code} />
            </TabsContent>

            <TabsContent value="heatmaps">
              <TeamHeatMapOverlay gridData={[]} gridSize={{ rows: 3, cols: 3 }} />
            </TabsContent>

            <TabsContent value="settings">
              <OrganizationRegistration existingOrg={activeOrg} />
            </TabsContent>
          </Tabs>
        ) : membership && organizationId ? (
          <PlayerOrganizationView
            organizationId={organizationId}
            roleInOrg={roleInOrg}
            orgName={orgName}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <JoinOrganization />
            <OrganizationRegistration />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
