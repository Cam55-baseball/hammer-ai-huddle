import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { localIso } from "@/hooks/usePitcherSchedule";
import { supabase } from "@/integrations/supabase/client";
import { practicesDueToday, type PracticePromptSource } from "@/lib/hammer/calendarPromptRules";
import { requiredAnalyses } from "@/lib/assessment/initialAssessment";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export function PracticeLogPromptCard() {
  const { user } = useAuth();
  const { modules } = useSubscription();
  const { sport } = useSportTheme();
  const navigate = useNavigate();
  const today = localIso();
  const q = useQuery({ queryKey: ["practice-log-prompt", user?.id, sport, today], enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("scheduled_practice_sessions")
        .select("id,scheduled_date,status,recurring_active,recurring_days,sport,session_module,title")
        .eq("user_id", user.id).eq("sport", sport)
        .or(`scheduled_date.eq.${today},recurring_active.eq.true`).limit(200);
      if (error) throw error;
      return data as PracticePromptSource[];
    },
  });
  if (q.error) return <p role="alert" className="text-sm text-destructive">Couldn't check today's practices.</p>;
  const due = practicesDueToday(q.data ?? [], today, sport, requiredAnalyses(modules.filter(m => m.startsWith(`${sport}_`))));
  return <>{due.map(row => <Card key={row.id} className="border-primary/30"><CardContent className="flex flex-wrap items-center gap-3 p-4">
    <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Practice today — log it</p><p className="text-xs text-muted-foreground">{row.title}</p></div>
    <Button size="sm" onClick={() => navigate(`/practice?scheduled=${encodeURIComponent(row.id)}&module=${encodeURIComponent(row.session_module)}`)}>Log practice</Button>
  </CardContent></Card>)}</>;
}