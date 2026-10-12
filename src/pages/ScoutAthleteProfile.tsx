import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoutGamePlayTab } from "@/components/scout/ScoutGamePlayTab";
import { ScoutTabContents, ScoutTabTriggers, useScoutProfile } from "@/components/scout/ScoutProfileTabs";

/** Scout Profile for one followed athlete. Each tab shows only what the family shared. */
export default function ScoutAthleteProfile() {
  const { athleteId = "" } = useParams();
  const navigate = useNavigate();
  const q = useScoutProfile(athleteId);
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/scout-dashboard")}>← Scout Dashboard</Button>
        <h1 className="text-xl font-semibold">Scout Profile{q.data?.overview?.full_name ? `: ${q.data.overview.full_name}` : ""}</h1>
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto">
            <ScoutTabTriggers />
            <TabsTrigger value="games">Game play and stats</TabsTrigger>
          </TabsList>
          <ScoutTabContents q={q} athleteId={athleteId!} />
          <TabsContent value="games"><ScoutGamePlayTab athleteId={athleteId} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
