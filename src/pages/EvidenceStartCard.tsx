/** DEV-only evidence: the Start card as four player types see it. */
import { StartHammersTodayCardView } from "@/components/hammer/StartHammersTodayCard";

const PLAYERS: Record<string, { positions: string[]; sport: string; age: number }> = {
  pitcher: { positions: ["P"], sport: "baseball", age: 15 },
  position: { positions: ["SS"], sport: "baseball", age: 16 },
  two_way: { positions: ["P", "CF"], sport: "baseball", age: 17 },
  softball: { positions: ["C"], sport: "softball", age: 16 },
};

export default function EvidenceStartCard() {
  const role = new URLSearchParams(window.location.search).get("p") ?? "pitcher";
  const p = PLAYERS[role] ?? PLAYERS.pitcher;
  return (
    <div className="min-h-screen bg-background p-3">
      <StartHammersTodayCardView onStart={() => undefined} starting={false} error={null} positions={p.positions} sport={p.sport} age={p.age} />
    </div>
  );
}
