import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { movementHasPain, type MovementScreen } from "@/lib/assessment/movementScreen";
import { movementSummary } from "@/lib/assessment/movementSummary";

/** Self-owned observations only; never authors a plan, finding, or clinical interpretation. */
export function SavedMovementSummary() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["saved-movement-summary", user?.id], enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      const { data, error } = await supabase.from("initial_assessments").select("movement_screen,updated_at").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    } });
  if (query.error) return <p role="alert" className="text-xs text-destructive">Couldn't load your saved movement checks.</p>;
  const screen = (query.data?.movement_screen ?? {}) as MovementScreen;
  const rows = movementSummary(screen);
  if (!rows.length) return null;
  const statusText = (status: string | null) => status === "controlled" ? "Controlled" : status === "limited" ? "Limited" : status === "pain" ? "Pain reported" : "Not recorded";
  return <details className="border-y border-border py-3" data-saved-movement-summary>
    <summary className="cursor-pointer text-sm font-semibold">Saved movement observations</summary>
    {query.data?.updated_at && <p className="mt-2 text-xs text-muted-foreground">Assessment saved: {new Date(query.data.updated_at).toLocaleDateString()}</p>}
    <p className="mt-2 text-xs text-muted-foreground">These are recorded checks, not a diagnosis or proof of why you move this way. Your prescribed work is unchanged.</p>
    {movementHasPain(screen) && <p className="mt-2 text-sm text-destructive">Pain was reported. Stop painful checks and talk to a qualified professional.</p>}
    <dl className="mt-3 space-y-3">{rows.map(row => <div key={row.key}>
      <dt className="text-sm font-medium">{row.name}</dt>
      <dd className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <span>Left: {row.left == null ? "Not measured" : `${row.left} ${row.unit}`} · {statusText(row.leftStatus)}{row.leftScore == null ? "" : ` · Observation score: ${row.leftScore}/2`}</span>
        <span>Right: {row.right == null ? "Not measured" : `${row.right} ${row.unit}`} · {statusText(row.rightStatus)}{row.rightScore == null ? "" : ` · Observation score: ${row.rightScore}/2`}</span>
      </dd>
    </div>)}</dl>
  </details>;
}