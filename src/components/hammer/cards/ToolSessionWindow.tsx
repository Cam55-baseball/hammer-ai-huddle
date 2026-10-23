import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Eye, Timer } from "lucide-react";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { PRACTICE_WINDOW_SAVED, practiceWindowRoute, savedPracticeCount } from "@/lib/hammer/practiceWindow";
import { TOOL_WINDOW_SAVED, toolOccurrenceMatches, type ToolOccurrence } from "@/lib/hammer/toolWindow";

/** A same-origin tool window uses the existing authenticated module and its canonical saves. */
export function ToolSessionWindow({ label, route, kind, onPracticeSaved, occurrence }: { label: string; route: string; kind: "vision" | "timing" | "practice"; onPracticeSaved?: (count: number) => void; occurrence?: ToolOccurrence }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handled = useRef(new Set<string>());
  const callback = useRef(onPracticeSaved); callback.current = onPracticeSaved;
  const { user } = useOptionalAuth();
  const { sport } = useSportTheme();
  const qc = useQueryClient();
  const usageKey = ["today-tool-usage", user?.id, sport, route, occurrence?.exerciseId, occurrence?.planDate];
  const readUsage = async (sessionId?: string, launchToken?: string) => {
    if (!user || !occurrence) return false;
    if (kind === "vision") {
      const result = await supabase.from("tex_vision_drill_results").select("session_id,drill_metrics,completed_at,tex_vision_sessions!inner(sport)")
        .eq("user_id", user.id).eq("tex_vision_sessions.sport", sport).not("completed_at", "is", null)
        .contains("drill_metrics", { today_exercise: { exercise_id: occurrence.exerciseId, plan_date: occurrence.planDate } });
      if (result.error) throw result.error;
      return result.data.some(row => (!sessionId || row.session_id === sessionId) && toolOccurrenceMatches((row.drill_metrics as Record<string, unknown> | null)?.today_exercise, occurrence, launchToken));
    }
    if (kind === "timing") {
      const result = await supabase.from("royal_timing_sessions").select("id,timer_data,video_1_path,video_2_path").eq("user_id", user.id).eq("sport", sport)
        .contains("timer_data", { today_exercise: { exercise_id: occurrence.exerciseId, plan_date: occurrence.planDate } });
      if (result.error) throw result.error;
      return result.data.some(row => {
        const data = row.timer_data as Record<string, unknown> | null;
        const timed = [data?.timer1, data?.timer2, data?.master].some(timer => timer && typeof timer === "object" && "elapsed" in timer && Number(timer.elapsed) > 0);
        return (!sessionId || row.id === sessionId) && toolOccurrenceMatches(data?.today_exercise, occurrence, launchToken) && !!(timed || row.video_1_path || row.video_2_path);
      });
    }
    const result = await supabase.from("performance_sessions").select("id,fatigue_state_at_session,micro_layer_data").eq("user_id", user.id).eq("sport", sport)
      .eq("module", "pitching").eq("session_type", "pickoff_training").is("deleted_at", null)
      .contains("fatigue_state_at_session", { today_exercise: { exercise_id: occurrence.exerciseId, plan_date: occurrence.planDate } });
    if (result.error) throw result.error;
    return result.data.some(row => (!sessionId || row.id === sessionId) && toolOccurrenceMatches((row.fatigue_state_at_session as Record<string, unknown> | null)?.today_exercise, occurrence, launchToken) && Array.isArray(row.micro_layer_data) && row.micro_layer_data.length > 0);
  };
  const usage = useQuery({ queryKey: usageKey, enabled: !!user && !!occurrence, queryFn: () => readUsage() });
  useEffect(() => {
    if (!open || !token || !user) return;
    const receive = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (occurrence && message?.type === TOOL_WINDOW_SAVED && message.token === token && typeof message.sessionId === "string" && !handled.current.has(message.sessionId)) {
        try {
          if (!await readUsage(message.sessionId, token)) { setError("This saved tool session does not match this exercise, or has no recorded work."); return; }
          handled.current.add(message.sessionId);
          await qc.invalidateQueries({ queryKey: usageKey });
          setOpen(false);
        } catch { setError("Couldn't check your saved tool session. Try returning to the exercise again."); }
        return;
      }
      if (message?.type !== PRACTICE_WINDOW_SAVED || message.token !== token || typeof message.sessionId !== "string" || handled.current.has(message.sessionId)) return;
      const module = new URL(route, window.location.origin).searchParams.get("module");
      if (!module) return;
      const result = await supabase.from("performance_sessions").select("user_id,sport,module,deleted_at,fatigue_state_at_session,micro_layer_data")
        .eq("id", message.sessionId).eq("user_id", user.id).single();
      if (result.error) { setError("Couldn't check your saved practice. Your exercise entries are unchanged."); return; }
      const count = savedPracticeCount(result.data, { userId: user.id, sport, module, token });
      if (count == null) { setError("This practice does not match the current exercise."); return; }
      handled.current.add(message.sessionId); callback.current?.(count); setOpen(false);
      void qc.invalidateQueries({ queryKey: ["recent-sessions"] });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [open, token, user?.id, sport, route, qc, occurrence?.exerciseId, occurrence?.planDate]);
  const close = (value: boolean) => {
    setOpen(value);
    if (!value) {
      void qc.invalidateQueries({ queryKey: ["tex-vision-progress"] });
      void qc.invalidateQueries({ queryKey: ["royal-timing-reminder"] });
      void qc.invalidateQueries({ queryKey: ["performance-sessions"] });
      void qc.invalidateQueries({ queryKey: ["royal-timing-sessions"] });
      void qc.invalidateQueries({ queryKey: ["recent-sessions"] });
      if (occurrence) void qc.invalidateQueries({ queryKey: usageKey });
    }
  };
  const Icon = kind === "vision" ? Eye : kind === "timing" ? Timer : Camera;
  const toolUrl = new URL(route, window.location.origin);
  if (occurrence) {
    toolUrl.searchParams.set("today_tool_token", token);
    toolUrl.searchParams.set("today_exercise_id", occurrence.exerciseId);
    toolUrl.searchParams.set("today_plan_date", occurrence.planDate);
  }
  return <>
    <Button size="sm" variant="outline" onClick={() => { setToken(crypto.randomUUID()); setError(null); setOpen(true); }}><Icon className="mr-1 h-4 w-4" />{label}</Button>
    {occurrence && usage.data === true && <span className="self-center text-xs text-primary">{label} completed</span>}
    {usage.isError && <p role="alert" className="text-xs text-destructive">Couldn't check saved tool usage.</p>}
    <Dialog open={open} onOpenChange={close}><DialogContent className="z-[70] flex h-[95dvh] w-[calc(100%-1rem)] max-w-3xl flex-col p-3">
      <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
      <iframe ref={frame} src={onPracticeSaved ? practiceWindowRoute(route, token) : `${toolUrl.pathname}${toolUrl.search}`} title={label} allow="camera; microphone; fullscreen" className="min-h-0 w-full flex-1 border-0" />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button size="sm" variant="outline" onClick={() => close(false)}>Return to exercise</Button>
    </DialogContent></Dialog>
  </>;
}