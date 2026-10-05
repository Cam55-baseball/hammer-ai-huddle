/**
 * Stage 5 — ask athletes to rank their five training areas. The ranking tilts
 * which drills fill each slot inside what the plan already allows; it never
 * adds work or unlocks anything. Shown until the athlete ranks (or hides it
 * for today).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListOrdered, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, normalizeCategoryOrder, type CategoryKey } from "@/lib/hammer/goals/categoryGoals";
import { useContext } from "react";
import { HammersTodayContext } from "@/components/hammer/HammersTodayProvider";

const HIDE = "hm.rankGoalsHidden.";

export function RankGoalsPromptCard({ forceOpen = false }: { forceOpen?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const plan = useContext(HammersTodayContext);
  const [order, setOrder] = useState<CategoryKey[]>([]);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const hideKey = `${HIDE}${user?.id}.${today}`;
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(hideKey) === "1"; } catch { return false; } });

  const q = useQuery({
    queryKey: ["goal-ranking", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("athlete_context").select("category_goals").eq("user_id", user!.id).maybeSingle();
      const raw = (data as { category_goals?: Record<string, unknown> | null } | null)?.category_goals ?? null;
      return { raw, ranked: normalizeCategoryOrder(raw?.categoryOrder) };
    },
  });

  if (!q.data || (q.data.ranked && !forceOpen) || (hidden && !forceOpen)) return null;

  const tap = (k: CategoryKey) => setOrder((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  const save = async () => {
    if (order.length !== CATEGORY_KEYS.length) return;
    setSaving(true);
    const base = q.data!.raw && typeof q.data!.raw === "object" ? q.data!.raw : { version: 2 };
    const { error } = await supabase.from("athlete_context").upsert(
      { user_id: user!.id, category_goals: { ...base, version: (base as any).version ?? 2, categoryOrder: order, updatedAt: new Date().toISOString() } as never },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) { toast.error(`Couldn't save your ranking: ${error.message}`); return; }
    toast.success("Saved. Your plan will lean toward what you ranked first.");
    qc.invalidateQueries({ queryKey: ["goal-ranking"] });
    try { plan?.generate?.(); } catch { /* next open picks it up */ }
  };

  return (
    <Card className="border-primary/30" data-testid="rank-goals-prompt">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <ListOrdered className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">What matters most to you?</p>
            <p className="text-xs text-muted-foreground">Tap these in order, most important first. Your plan leans toward the top ones. You still train all of them.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {CATEGORY_KEYS.map((k) => {
            const pos = order.indexOf(k);
            return (
              <button key={k} type="button" onClick={() => tap(k)}
                className={`w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left ${pos >= 0 ? "border-primary bg-primary/10" : "border-border"}`}
                aria-label={`${CATEGORY_LABELS[k]}${pos >= 0 ? `, ranked ${pos + 1}` : ""}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pos >= 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{pos >= 0 ? pos + 1 : ""}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{CATEGORY_LABELS[k]}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{CATEGORY_DESCRIPTIONS[k]}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" disabled={order.length !== CATEGORY_KEYS.length || saving} onClick={save}>
            {order.length === CATEGORY_KEYS.length ? "Save my order" : "Tap all five"}
          </Button>
          {order.length > 0 && <Button size="sm" variant="outline" onClick={() => setOrder([])} aria-label="Start over"><RotateCcw className="h-4 w-4" /></Button>}
          {!forceOpen && <Button size="sm" variant="ghost" onClick={() => { try { localStorage.setItem(hideKey, "1"); } catch { /* ignore */ } setHidden(true); }}>Later</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
