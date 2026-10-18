import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function OptionalSharingControl({ athleteId }: { athleteId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["parent-optional-sharing", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("parent_optional_sharing", { _athlete: athleteId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  if (q.isPending) return <p className="text-sm text-muted-foreground">Loading sharing permission…</p>;
  if (q.error) return <p role="alert" className="text-sm text-destructive">Couldn't load sharing permission.</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Optional service sharing needs an active signed Parent Promise.</p>;
  const save = async (enabled: boolean) => {
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.rpc("set_parent_optional_sharing", { _athlete: athleteId, _enabled: enabled });
      if (error) throw error;
      await q.refetch();
    } catch { setError("Couldn't save sharing permission. Try again."); }
    finally { setSaving(false); }
  };
  return <section className="space-y-2" aria-label="Optional service sharing">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={`optional-sharing-${athleteId}`}>Optional sharing with connected services</Label>
        <p className="text-sm text-muted-foreground">This does not show your child to scouts. Health details still need their separate health permission.</p>
      </div>
      <Switch id={`optional-sharing-${athleteId}`} checked={q.data.optional_sharing} disabled={saving} onCheckedChange={save} />
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}