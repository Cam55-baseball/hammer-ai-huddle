import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HammersCard } from "@/components/intelligence/HammersCard";
import { repeatedPain, WINDOW_DAYS, type PainEntry } from "@/lib/intelligence/healthFlags";

/** Shows only when the player themself reported the same pain 3+ times in 14 days. */
export function HealthFlagsCard() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["health-flags", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
      const { data, error } = await supabase
        .from("vault_focus_quizzes")
        .select("created_at, pain_location, pain_scale")
        .eq("user_id", user!.id)
        .gte("created_at", since);
      if (error) throw error;
      return repeatedPain((data ?? []) as PainEntry[]);
    },
  });
  if (!data?.length) return null;
  return (
    <div className="space-y-3">
      {data.map((f) => (
        <HammersCard
          key={f.area}
          title="Health check"
          weSee={`Pain spot: ${f.area} — you reported it ${f.times} times in the last ${WINDOW_DAYS} days.`}
          because="From your own morning check-ins."
          howSure="measured"
          samples={f.times}
          doThis="Please talk to a professional (a doctor, athletic trainer or physical therapist)."
          checkBack="Keep answering the pain question in your check-in."
        />
      ))}
    </div>
  );
}
