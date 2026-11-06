/** Dev-only harness (Owner Nov 6 r4, G15): the real coach player tab strip + real week calendar with long names. */
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CoachAthleteTabStrip } from "@/components/coach/CoachAthleteTabStrip";
import { CoachPlayerWeek } from "@/components/coach/CoachPlayerWeek";
import { weekDates, type WeekResult } from "@/lib/coach/playerWeek";
import { getTodayDate } from "@/utils/dateUtils";

const LONG = [
  { title: "Full-body warm-up with progressive sprint prep and arm-care ladder for position players", drills: ["Lateral lunge with overhead reach and thoracic rotation hold", "A-skip into dribble build-ups at 60, 75 and 90 percent"] },
  { title: "Defense — backhand footwork, short-hop picks and throwing errors fix from the deep hole", drills: ["Backhand short-hop to crow-hop throw at full intent from deep shortstop hole"] },
];
function seeded() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const dates = weekDates(getTodayDate(), 0);
  const days = dates.map((date, i) => ({
    date, restDay: i === 6, prescriptions: [], logs: [], coachWorkouts: [], games: [],
    tasks: i === 0 ? [{ task_id: "warmup:lateral-lunge-with-overhead-reach-and-thoracic-rotation-hold", side: null, completed: false, outcome: "skipped", name: "", dosage: "" }] : [],
    plan: { state: "ok", blocks: i === 6 ? [] : LONG.map((c) => ({ status: "ready", modality: "warmup", title: c.title, drills: c.drills.map((name) => ({ name, dosage: "2 × 10 each side" })) })) },
  }));
  const data = { state: "ok", sport: "baseball", days } as unknown as WeekResult;
  qc.setQueryData(["coach-player-week", undefined, "harness", dates[0]], data);
  return qc;
}
export default function CoachPlayerPageHarness() {
  const [qc] = useState(seeded);
  const [tab, setTab] = useState("checkins");
  return <QueryClientProvider client={qc}>
    <main className="mx-auto max-w-[390px] space-y-3 bg-background p-4">
      <h1 className="text-xl font-semibold">Jonathan Christopher Alexander-Montgomery</h1>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <CoachAthleteTabStrip value={tab} />
        <TabsContent value="checkins" className="pt-4"><p className="text-sm">Check-ins &amp; readiness</p></TabsContent>
        <TabsContent value="week" className="pt-4"><CoachPlayerWeek athleteId="harness" /></TabsContent>
      </Tabs>
      <section className="border-t pt-3"><h2 className="font-semibold">Week calendar (same page)</h2><CoachPlayerWeek athleteId="harness" /></section>
    </main>
  </QueryClientProvider>;
}
