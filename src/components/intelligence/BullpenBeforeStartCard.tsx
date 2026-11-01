import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HammersCard } from "@/components/intelligence/HammersCard";
import { bullpenBeforeStartCard, type Followups } from "@/lib/intelligence/bullpenBeforeStart";

/** Owner Nov 1: tracked "bullpen before start" insight, for the player and the coach view. */
export function BullpenBeforeStartCard({ athleteId, sport, who }: { athleteId: string; sport: "baseball" | "softball"; who: "player" | "coach" }) {
  const { data } = useQuery({
    queryKey: ["bullpen-before-start", athleteId, sport],
    enabled: !!athleteId,
    queryFn: async () => {
      const db = supabase as any;
      const { data: f, error } = await db.rpc("bullpen_before_start_followups", { _athlete: athleteId });
      if (error) throw error;
      const fol = f as Followups;
      if (!fol?.tracked?.length) return { f: fol, games: [] };
      const today = new Date().toISOString().slice(0, 10);
      const { data: lines } = await db.rpc("mastery_pitching_lines", { p_sport: sport, p_date: today, p_athlete: athleteId });
      return { f: fol, games: Array.isArray(lines) ? lines : [] };
    },
  });
  const card = bullpenBeforeStartCard(data?.f ?? null, data?.games ?? [], who);
  if (!card.show) return null;
  return <HammersCard title="Bullpen the day before a start" weSee={card.weSee} because={card.because} howSure={card.howSure} samples={card.samples} doThis={card.doThis} checkBack={card.checkBack} />;
}
