import { SponsorshipsCard } from "@/components/organization/SponsorshipsCard";
import { SendAthleteRequest } from "@/components/connections/SendAthleteRequest";
import { TeamDisciplineSummary } from "@/components/coach/TeamDisciplineSummary";
import { CoachPrescriptionStatus } from '@/components/coach/CoachPrescriptionStatus';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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
import { OrgVerificationForm } from '@/components/organization/OrgVerificationCards';
import { AssignAthletesCard } from '@/components/organization/AssignAthletesCard';
import { FacilitySpaces } from '@/components/organization/FacilitySpaces';
import { FacilityBoard } from '@/components/organization/FacilityBoard';
import { CompareAthletes } from '@/components/organization/CompareAthletes';
import { GrowthTrends } from '@/components/organization/GrowthTrends';
import { TestingDays } from '@/components/organization/TestingDays';
import { CompareByTest } from "@/components/organization/CompareByTest";
import { useFeatureSwitches } from '@/hooks/useFeatureSwitches';

export default function OrganizationDashboard() {
  const { myOrgs, members } = useOrganization();
  const spacesOn = useFeatureSwitches().isEnabled('facility_spaces');
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
          <>
          <SendAthleteRequest organizationId={activeOrg.id} inviteCode={activeOrg.invite_code} orgName={activeOrg.name} />
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="sent-workouts">Sent workouts</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invite">Invite</TabsTrigger>
              <TabsTrigger value="heatmaps">Heat Maps</TabsTrigger>
              {spacesOn && (activeOrg.org_type === 'facility' || activeOrg.org_type === 'academy') && (
                <TabsTrigger value="spaces">Spaces</TabsTrigger>
              )}
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Plan v3.1 Phase 6 — facility tools: manage training spaces */}
            {spacesOn && (activeOrg.org_type === 'facility' || activeOrg.org_type === 'academy') && (
              <TabsContent value="spaces">
                <FacilitySpaces orgId={activeOrg.id} canManage />
              </TabsContent>
            )}

            <TabsContent value="overview">
              <TeamComplianceCard
                avgIntegrity={teamStats?.avgIntegrity ?? 0}
                coachValidationPct={teamStats?.coachValidationPct ?? 0}
                activeMemberCount={teamStats?.activeMemberCount ?? memberList.length}
                flaggedCount={teamStats?.flaggedCount ?? 0}
              />
            </TabsContent>

            <TabsContent value="players">
              <div className="space-y-4"><FacilityBoard orgId={activeOrg.id} /><TeamDisciplineSummary orgId={activeOrg.id} /><SponsorshipsCard orgId={activeOrg.id} /></div>
            </TabsContent>

            <TabsContent value="compare">
              <div className="space-y-4"><CompareAthletes orgId={activeOrg.id} /><CompareByTest orgId={activeOrg.id} /></div>
            </TabsContent>
            <TabsContent value="trends">
              <GrowthTrends orgId={activeOrg.id} />
            </TabsContent>
            <TabsContent value="testing">
              <TestingDays orgId={activeOrg.id} />
            </TabsContent>
            <TabsContent value="sent-workouts" className="space-y-4">
              <Button asChild variant="outline"><Link to="/my-custom-activities">My Workouts</Link></Button>
              <CoachPrescriptionStatus />
            </TabsContent>

            <TabsContent value="announcements">
              <TeamAnnouncements orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="roster">
              <TeamRosterView orgId={activeOrg.id} />
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <AssignAthletesCard orgId={activeOrg.id} />
              <OrganizationMemberList />
            </TabsContent>

            <TabsContent value="invite">
              <InviteCodeCard orgId={activeOrg.id} existingCode={activeOrg.invite_code} />
            </TabsContent>

            <TabsContent value="heatmaps">
              <TeamHeatMapOverlay gridData={[]} gridSize={{ rows: 3, cols: 3 }} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <OrgVerificationForm org={activeOrg} />
              <OrganizationRegistration existingOrg={activeOrg} />
            </TabsContent>
          </Tabs>
          </>
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
