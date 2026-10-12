import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoutGamePlayTab } from "@/components/scout/ScoutGamePlayTab";

/** Scout Profile for one followed athlete. Each tab shows only what the family shared. */
export default function ScoutAthleteProfile() {
  const { athleteId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/scout-dashboard")}>← Scout Dashboard</Button>
        <h1 className="text-xl font-semibold">Scout Profile</h1>
        <Tabs defaultValue="games">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="games">Game play and stats</TabsTrigger>
          </TabsList>
          <TabsContent value="games"><ScoutGamePlayTab athleteId={athleteId} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
