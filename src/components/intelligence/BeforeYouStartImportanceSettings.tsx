import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBysImportance } from "@/hooks/useBysImportance";
import { Button } from "@/components/ui/button";
import { BYS_ITEMS, BYS_SETTING_KEY, bysLevel, type BysLevel } from "@/lib/hammer/beforeYouStartImportance";

/** Owner map: which "Before you start" drawer (Level 1 / 2 / 3) each item sits in. */
export function BeforeYouStartImportanceSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const saved = useBysImportance();
  const [draft, setDraft] = useState<Record<string, BysLevel>>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    if (saved.isSuccess) setDraft(Object.fromEntries(BYS_ITEMS.map((i) => [i.id, bysLevel(i.id, saved.data)])));
  }, [saved.isSuccess, saved.data]);

  const save = async () => {
    if (!user) return;
    setState("saving");
    const { data: existing, error: readErr } = await supabase.from("app_settings").select("id").eq("setting_key", BYS_SETTING_KEY).maybeSingle();
    const row = { setting_key: BYS_SETTING_KEY, setting_value: draft, updated_by: user.id, updated_at: new Date().toISOString() };
    const { error } = readErr ? { error: readErr } : existing
      ? await supabase.from("app_settings").update(row).eq("id", existing.id)
      : await supabase.from("app_settings").insert(row);
    if (error) { setState("error"); return; }
    await qc.invalidateQueries({ queryKey: ["app-setting", BYS_SETTING_KEY] });
    setState("saved");
  };

  return (
    <section aria-label="Before you start importance" className="space-y-2 border-b border-border py-3">
      <h2 className="font-semibold">Before you start — importance map</h2>
      <p className="text-xs text-muted-foreground">Pick a drawer for each item: Level 1 (green), Level 2 (yellow), Level 3 (red). Items keep their own rules for when they show; anything not set shows in Level 2.</p>
      {saved.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load the saved map. Try again later.</p> : (
        <ul className="space-y-2">
          {BYS_ITEMS.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0"><p className="text-sm font-medium">{item.label}</p><p className="text-[11px] text-muted-foreground">Shows when: {item.when}</p></div>
              <div className="flex gap-1" role="radiogroup" aria-label={`${item.label} level`}>
                {([1, 2, 3] as const).map((lv) => (
                  <Button key={lv} type="button" size="sm" role="radio" aria-checked={draft[item.id] === lv}
                    variant={draft[item.id] === lv ? "default" : "outline"} className="h-9 w-12"
                    onClick={() => { setDraft((d) => ({ ...d, [item.id]: lv })); setState("idle"); }}>L{lv}</Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" onClick={() => void save()} disabled={state === "saving" || !saved.isSuccess}>{state === "saving" ? "Saving…" : "Save map"}</Button>
        {state === "saved" && <span role="status" className="text-xs text-muted-foreground">Saved. Players see the new drawers on their next visit.</span>}
        {state === "error" && <span role="alert" className="text-xs text-destructive">Couldn't save. Nothing changed. Try again.</span>}
      </div>
    </section>
  );
}
