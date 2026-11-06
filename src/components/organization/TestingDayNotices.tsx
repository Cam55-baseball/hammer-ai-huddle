import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export interface TestingDayNotice { id: string; title: string; message: string; is_read: boolean; created_at: string }

/** Shows testing-day notices (scheduled, moved, skipped, 3-day and day-of) to the player and their coaches. */
export function TestingDayNoticesView({ notices, onRead }: { notices: TestingDayNotice[]; onRead?: (ids: string[]) => void }) {
  if (!notices.length) return null;
  const unread = notices.filter((n) => !n.is_read).map((n) => n.id);
  return (
    <section className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2" data-testid="testing-day-notices">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Testing days</h2>
        {unread.length > 0 && onRead && <Button size="sm" variant="ghost" onClick={() => onRead(unread)}>Mark as read</Button>}
      </div>
      <ul className="space-y-1">
        {notices.map((n) => (
          <li key={n.id} className={`text-sm ${n.is_read ? "text-muted-foreground" : ""}`}>
            <span className="font-medium">{n.title}</span> · {n.message}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TestingDayNotices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    // Sends any due 3-day / day-of reminders for testing days this person is part of.
    void (supabase as any).rpc("send_my_testing_day_reminders").then(({ data }: { data: number | null }) => {
      if (data) void qc.invalidateQueries({ queryKey: ["testing-day-notices", user.id] });
    });
  }, [user?.id, qc]);
  const { data } = useQuery({
    queryKey: ["testing-day-notices", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<TestingDayNotice[]> => {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data, error } = await supabase.from("coach_notifications")
        .select("id,title,message,is_read,created_at")
        .eq("coach_user_id", user!.id).eq("notification_type", "testing_day")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []) as TestingDayNotice[];
    },
  });
  const markRead = async (ids: string[]) => {
    await supabase.from("coach_notifications").update({ is_read: true }).in("id", ids);
    void qc.invalidateQueries({ queryKey: ["testing-day-notices", user?.id] });
  };
  return <TestingDayNoticesView notices={data ?? []} onRead={markRead} />;
}
