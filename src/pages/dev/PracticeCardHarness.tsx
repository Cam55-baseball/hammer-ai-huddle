/** Dev-only harness (not routed in production builds): the REAL Hammers Today practice card
 *  (PocketCard + BlockCard) built from a sample plan, for phone screenshots. */
import { useNavigate } from "react-router-dom";
import { PocketCard } from "@/components/hammer/cards/PocketCard";
import { BlockCard } from "@/components/hammer/HammerDailyPlan";
import { HammersTodayProvider } from "@/components/hammer/HammersTodayProvider";
import { buildHammerDailyPlan } from "@/lib/hammer/prescription/dailyPlan";
import { NORMAL_SIGNAL } from "@/lib/hammer/prescription/scheduleContext";
import { cardPracticeRoute } from "@/lib/hammer/practiceWindow";
import { getTodayDate } from "@/utils/dateUtils";
import type { ContextVariable, HammerAthleteContext } from "@/lib/hammer/context/athleteContext";

function ctx(values: Record<string, unknown>): HammerAthleteContext {
  const variables = Object.entries(values).map(([key, value]): ContextVariable => ({ key, value, label: key,
    domain: "identity", source: "sample", confidence: "high", missing: false, lastUpdated: null,
    lineage: { owner: "sample", source: "sample", rawConfidence: "high" } }));
  return { variables, missing: [], missingCount: 0, isLoading: false, envelope: null,
    get<T>(key: string) { return variables.find((row) => row.key === key) as ContextVariable<T> | undefined; } };
}
const gear = ["tee", "gamer_bat", "net", "field", "glove", "ball", "baseballs", "bands", "partner", "plyo_balls", "bucket", "bases", "cones"];

export default function PracticeCardHarness() {
  const navigate = useNavigate();
  const card = new URLSearchParams(window.location.search).get("card") ?? "defense";
  const pitcher = card === "throwing" || card === "pitching";
  const plan = buildHammerDailyPlan(ctx({ sport_primary: "baseball", position_primary: pitcher ? "P" : "SS", season_phase: "off", age_years: 20,
    lifecycle_band: "college", lifting_age_years: 2, development_priorities: ["throwing", "defense", "hitting"], weekly_availability_days: 6, injury_history: [], equipment_effective: gear }),
    NORMAL_SIGNAL, null, null, undefined, new Date(2026, 5, 2), { subscriptionModules: [pitcher ? "baseball_pitcher" : "baseball_5tool"] });
  const block = plan.blocks.find((b) => b.modality === card && b.drills.length > 0);
  if (!block) return <main className="p-4 text-sm">No {card} card in the sample plan.</main>;
  const route = block.route.startsWith("/practice") ? cardPracticeRoute(block.route, { modality: block.modality, activity: block.title }, getTodayDate()) : null;
  return (
    <HammersTodayProvider>
    <main className="mx-auto max-w-md space-y-3 bg-background p-4">
      <PocketCard id={`harness-${card}`} category={block.title} tone="bg-primary" planDate={getTodayDate()} prescribed practiceRoute={route}
        countLabel={`${block.drills.length} items`}>
        {() => <BlockCard block={block} onNavigate={navigate} />}
      </PocketCard>
    </main>
    </HammersTodayProvider>
  );
}
