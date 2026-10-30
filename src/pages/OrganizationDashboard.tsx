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
import { InviteCodeCard } from '@/components/organization/InviteCodeCard';
import { JoinOrganization } from '@/components/organization/JoinOrganization';
import { TeamAnnouncements } from '@/components/organization/TeamAnnouncements';
import { Building2 } from 'lucide-react';
import { AssignAthletesCard } from '@/components/organization/AssignAthletesCard';
import { FacilitySpaces } from '@/components/organization/FacilitySpaces';
import { FacilityBoard } from '@/components/organization/FacilityBoard';
import { CompareAthletes } from '@/components/organization/CompareAthletes';
import { GrowthTrends } from '@/components/organization/GrowthTrends';
import { TestingDays } from '@/components/organization/TestingDays';
import { CompareByTest } from "@/components/organization/CompareByTest";
import { useFeatureSwitches } from '@/hooks/useFeatureSwitches';
import { MeaningSection } from '@/components/progress/SectionMeaning';
import { OrganizationProgress } from '@/components/organization/OrganizationProgress';
import { InviteCoach } from '@/components/organization/InviteCoach';

export default function OrganizationDashboard() {
  const { myOrgs, members } = useOrganization();
  const spacesOn = useFeatureSwitches().isEnabled('facility_spaces');
  const { membership, organizationId, roleInOrg, orgName } = usePlayerOrganization();
  const activeOrg = myOrgs.data?.[0];
  const memberList = members.data ?? [];
  const { data: teamStats } = useTeamStats(activeOrg?.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-start gap-2 break-words">
            <Building2 className="h-8 w-8 shrink-0 text-primary" />
            {activeOrg?.name ?? 'Organization'}
          </h1>
          <p className="text-muted-foreground">Organization Dashboard</p>
        </div>

        {activeOrg ? (
          <>
          <Tabs defaultValue="roster" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-6">
              <TabsTrigger className="min-h-11 whitespace-normal" value="roster">Roster</TabsTrigger>
              <TabsTrigger className="min-h-11 whitespace-normal" value="teams">Teams</TabsTrigger>
              <TabsTrigger className="min-h-11 whitespace-normal" value="testing">Testing</TabsTrigger>
              <TabsTrigger className="min-h-11 whitespace-normal" value="workouts">Workouts</TabsTrigger>
              <TabsTrigger className="min-h-11 whitespace-normal" value="results">Results &amp; Trends</TabsTrigger>
              <TabsTrigger className="min-h-11 whitespace-normal" value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="roster" className="space-y-6">
              <MeaningSection organization title="Roster Progress" use="Check who is under 50% this week and message them or their coach first. Tap a player to see what they missed." explanation="Bars show completed cards out of planned cards in the last seven days. They measure recorded completion, not ability or effort. A player with no planned work has no percentage."><OrganizationProgress orgId={activeOrg.id}/><FacilityBoard orgId={activeOrg.id}/></MeaningSection>
              <MeaningSection organization title="Players & Connections" use="Open a player to see their shared work. If someone is missing, send them an invite below." explanation="Active organization members are listed here. Membership does not replace the player's sharing permissions. Open a player to see only what they share." collapsed><TeamRosterView orgId={activeOrg.id}/></MeaningSection>
              <MeaningSection organization title="Invite Players" use="Send the code or a request to each player. They show up in your roster once they accept." explanation="Invite a player using the existing connection request or organization code. The player still chooses whether to join." collapsed><SendAthleteRequest organizationId={activeOrg.id} inviteCode={activeOrg.invite_code} orgName={activeOrg.name}/><InviteCodeCard orgId={activeOrg.id} existingCode={activeOrg.invite_code}/></MeaningSection>
            </TabsContent>
            <TabsContent value="teams" className="space-y-6">
              <MeaningSection organization title="Teams & Staff" use="Put each player on a team and give each team a coach. A coach only sees the players you assign." explanation="Group athletes with the teams and coaches who work with them. Assignments control which athletes a coach can open; they do not grant wider health access."><InviteCoach orgId={activeOrg.id}/><AssignAthletesCard orgId={activeOrg.id}/><OrganizationMemberList/></MeaningSection>
              <MeaningSection organization title="Announcements" use="Post game times, schedule changes and reminders here so everyone sees the same message." explanation="Organization announcements are shared updates, not individual workout prescriptions." collapsed><TeamAnnouncements orgId={activeOrg.id}/></MeaningSection>
              {spacesOn && (activeOrg.org_type === 'facility' || activeOrg.org_type === 'academy') && <MeaningSection organization title="Training Spaces" use="Add your spaces and book times so coaches don't double-book a cage or field." explanation="Manage your existing facility spaces and schedules." collapsed><FacilitySpaces orgId={activeOrg.id} canManage/></MeaningSection>}
              <MeaningSection organization title="Organization Details" use="Keep your name, sport and contact info current so players and parents know who you are." explanation="Your organization is active automatically. These details describe it; they are not identity certification." collapsed><OrganizationRegistration existingOrg={activeOrg}/></MeaningSection>
            </TabsContent>
            <TabsContent value="testing" className="space-y-6">
              <MeaningSection organization title="Testing Days" use="Pick a date, invite players, then enter each result on the day. Retest every 6–8 weeks to see real change." explanation="Schedule testing and record the actual test results. An in-person verified result is different from an athlete-entered result."><TestingDays orgId={activeOrg.id}/></MeaningSection>
              <MeaningSection organization title="Testing Results" use="Pick one test and look for players far below the group. Give them extra work on that skill and retest." explanation="Compare the latest recorded result for one test. Check the test name, dates, positions, ages, levels and whether higher or lower is better. These numbers do not rank overall ability."><CompareByTest orgId={activeOrg.id}/></MeaningSection>
            </TabsContent>
            <TabsContent value="workouts" className="space-y-6">
              <MeaningSection organization title="Workouts" use="Send a workout, then check back for the player's answer. Follow up with anyone who hasn't responded." explanation="Send existing workouts and see the player's saved response. Sent is not completed; the player's recorded work is shown separately."><Button asChild variant="outline"><Link to="/my-custom-activities">My Workouts</Link></Button><CoachPrescriptionStatus/></MeaningSection>
              <MeaningSection organization title="Team Discipline" use="Find players who skip required items and talk with them about what's getting in the way." explanation="Discipline shows the existing required-item completion record, not a judgment about a player's character." collapsed><TeamDisciplineSummary orgId={activeOrg.id}/></MeaningSection>
            </TabsContent>
            <TabsContent value="results" className="space-y-6">
              <MeaningSection organization title="Growth vs. Game Trends" use="Look for weeks where training dropped and games got worse. Use it to start a talk, not to judge." explanation="Compare recorded training completion and game outcomes across the same stretch. These are separate measures. Moving together does not prove one caused the other."><GrowthTrends orgId={activeOrg.id}/></MeaningSection>
              <MeaningSection organization title="Compare Players" use="Only compare players of the same age, level and position. Use gaps to pick who needs which work." explanation="Comparisons use shared records only. Different ages, positions, levels and dates can make a comparison unfair." collapsed><CompareAthletes orgId={activeOrg.id}/></MeaningSection>
              <MeaningSection organization title="Team Summary" use="Use it for a quick headcount and to spot flagged records that need a coach's check." explanation="These existing totals summarize active members and recorded validation. No record is not a score of zero." collapsed><TeamComplianceCard avgIntegrity={teamStats?.avgIntegrity ?? 0} coachValidationPct={teamStats?.coachValidationPct ?? 0} activeMemberCount={teamStats?.activeMemberCount ?? memberList.length} flaggedCount={teamStats?.flaggedCount ?? 0}/></MeaningSection>
            </TabsContent>
            <TabsContent value="billing" className="space-y-6">
              <MeaningSection organization title="Billing & Plan" use="Open it when you need to add players, change your plan or update payment." explanation="View your organization's existing plan and manage billing through the secure payment service. Opening this page does not buy or change a plan."><Button asChild variant="outline"><Link to="/staff-plans">Manage Organization Plan</Link></Button></MeaningSection>
              <MeaningSection organization title="Sponsorships" use="Pick which players you sponsor. Their plan is covered, but they still control what they share." explanation="Use the existing sponsorship choices and limits. Sponsorship does not expand a player's data-sharing permissions."><SponsorshipsCard orgId={activeOrg.id}/></MeaningSection>
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
