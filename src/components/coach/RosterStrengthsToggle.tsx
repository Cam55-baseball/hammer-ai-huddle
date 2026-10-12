import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { strengthsAndWeaknesses, type DevReport } from "@/lib/coach/development";

/** Owner addition (Phase 6): strengths & weaknesses on the coach roster, loaded on tap only. */
export function RosterStrengthsToggle({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["roster-sw", athleteId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_development", { _athlete: athleteId });
      if (error) throw error;
      return strengthsAndWeaknesses((data?.reports ?? []) as DevReport[]);
    },
  });

  return (
    <div className="-mt-1 px-1">
      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
        Strengths & weaknesses
      </Button>
      {open && (
        <div className="space-y-2 rounded-md border border-border p-3 text-sm">
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {error && <p className="text-muted-foreground">Couldn't load this right now.</p>}
          {data && (
            <>
              {data.strengths.map((s) => (
                <div key={s.text}>
                  <p className="font-medium">Strength: {s.text}</p>
                  <p className="text-xs text-muted-foreground">{s.evidence}</p>
                </div>
              ))}
              {data.weaknesses.map((w) => (
                <div key={w.text}>
                  <p className="font-medium">Weakness: {w.text}</p>
                  <p className="text-xs text-muted-foreground">{w.evidence}</p>
                </div>
              ))}
              {data.note && <p className="text-muted-foreground">{data.note}</p>}
              <p className="text-xs text-muted-foreground">Source: video analysis reports</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
