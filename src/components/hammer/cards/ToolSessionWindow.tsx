import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Eye, Timer } from "lucide-react";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { PRACTICE_WINDOW_SAVED, practiceWindowRoute, savedPracticeCount } from "@/lib/hammer/practiceWindow";

/** A same-origin tool window uses the existing authenticated module and its canonical saves. */
export function ToolSessionWindow({ label, route, kind, onPracticeSaved }: { label: string; route: string; kind: "vision" | "timing" | "practice"; onPracticeSaved?: (count: number) => void }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handled = useRef(new Set<string>());
  const callback = useRef(onPracticeSaved); callback.current = onPracticeSaved;
  const { user } = useOptionalAuth();
  const { sport } = useSportTheme();
  const qc = useQueryClient();
  useEffect(() => {
    if (!open || !token || !user) return;
    const receive = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data;
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
  }, [open, token, user?.id, sport, route, qc]);
  const close = (value: boolean) => {
    setOpen(value);
    if (!value) {
      void qc.invalidateQueries({ queryKey: ["tex-vision-progress"] });
      void qc.invalidateQueries({ queryKey: ["royal-timing-reminder"] });
      void qc.invalidateQueries({ queryKey: ["performance-sessions"] });
      void qc.invalidateQueries({ queryKey: ["royal-timing-sessions"] });
      void qc.invalidateQueries({ queryKey: ["recent-sessions"] });
    }
  };
  const Icon = kind === "vision" ? Eye : kind === "timing" ? Timer : Camera;
  return <>
    <Button size="sm" variant="outline" onClick={() => { setToken(crypto.randomUUID()); setError(null); setOpen(true); }}><Icon className="mr-1 h-4 w-4" />{label}</Button>
    <Dialog open={open} onOpenChange={close}><DialogContent className="z-[70] flex h-[95dvh] w-[calc(100%-1rem)] max-w-3xl flex-col p-3">
      <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
      <iframe ref={frame} src={onPracticeSaved ? practiceWindowRoute(route, token) : route} title={label} allow="camera; microphone; fullscreen" className="min-h-0 w-full flex-1 border-0" />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button size="sm" variant="outline" onClick={() => close(false)}>Return to exercise</Button>
    </DialogContent></Dialog>
  </>;
}