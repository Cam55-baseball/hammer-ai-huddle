import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { OrganizationRegistration } from '@/components/organization/OrganizationRegistration';
import { OrganizationMemberList } from '@/components/organization/OrganizationMemberList';
import { TeamComplianceCard } from '@/components/organization/TeamComplianceCard';
import { TeamHeatMapOverlay } from '@/components/organization/TeamHeatMapOverlay';
import { Building2 } from 'lucide-react';

export default function OrganizationDashboard() {
  const { myOrgs, members } = useOrganization();
  const activeOrg = myOrgs.data?.[0];
  const memberList = members.data ?? [];

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
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="heatmaps">Heat Maps</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <TeamComplianceCard
                avgIntegrity={0}
                coachValidationPct={0}
                activeMemberCount={memberList.length}
                flaggedCount={0}
              />
            </TabsContent>

            <TabsContent value="members">
              <OrganizationMemberList />
            </TabsContent>

            <TabsContent value="heatmaps">
              <TeamHeatMapOverlay gridData={[]} gridSize={{ rows: 3, cols: 3 }} />
            </TabsContent>

            <TabsContent value="settings">
              <OrganizationRegistration existingOrg={activeOrg} />
            </TabsContent>
          </Tabs>
        ) : (
          <OrganizationRegistration />
        )}
      </div>
    </DashboardLayout>
  );
}
