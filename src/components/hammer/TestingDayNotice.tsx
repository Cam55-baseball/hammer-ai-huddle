/** Read-only testing-day notice for the athlete. No button: staff record results. */
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { testingDaysToday } from "@/lib/hammer/testingDayNotice";

export function TestingDayNotice() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error, isLoading } = useQuery({
    queryKey: ["testing-day-notice", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testing_days")
        .select("id,scheduled_for,status,tests")
        .eq("athlete_id", user!.id)
        .eq("scheduled_for", today);
      if (error) throw error;
      return testingDaysToday(data ?? [], today);
    },
  });
  if (error) return <p role="alert" className="text-sm text-destructive">Couldn't check for a testing day. Try again later.</p>;
  if (isLoading || !data?.length) return null;
  return (
    <>
      {data.map((d) => (
        <div key={d.id} className="rounded-md border border-border/60 bg-card px-2.5 py-2" data-testid="testing-day-notice">
          <div className="flex items-center gap-2 text-sm font-medium"><ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />Testing day today</div>
          <p className="mt-1 break-words text-[11px] text-muted-foreground">Tests: {(d.tests ?? []).filter((t) => t.trim()).join(", ")}</p>
          <p className="text-[11px] text-muted-foreground">Your coach records the results. Nothing to enter yourself.</p>
        </div>
      ))}
    </>
  );
}
