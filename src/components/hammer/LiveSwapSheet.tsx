import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import type { AtomicSwapSnapshot } from "@/lib/prescription/atomicSwap";
import type { UniversalSwapMovement } from "@/lib/prescription/universalSwapCandidates";
import { UniversalSwapConversation } from "./UniversalSwapConversation";
import { swapCatalogFingerprint } from "../../../supabase/functions/_shared/planSwap/visit";

/** Actual saved-row conversation. No legacy write fallback and no model-issued save. */
export function LiveSwapSheet({ rx, open, onOpenChange }: {
  rx: WkRx; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["plan-swap-visit", user?.id, rx.id, open], enabled: open && !!user,
    staleTime: 0, queryFn: async () => {
      if (!user) throw new Error("Sign in to use Swap.");
      const { data: row, error } = await supabase.from("wk_prescriptions").select("*")
        .eq("id", rx.id).eq("user_id", user.id).eq("plan_date", rx.plan_date).maybeSingle();
      if (error || !row) throw new Error("Reload your plan. This exercise could not be checked.");
      const { data: original, error: originalError } = await supabase.from("wk_movement_catalog").select("*")
        .eq("slug", row.movement_slug).maybeSingle();
      if (originalError || !original) throw new Error("I couldn't check the original exercise.");
      let catalog: UniversalSwapMovement[] = [];
      if (original.substitution_family && original.movement_category) {
        const { data: family, error: familyError } = await supabase.from("wk_movement_catalog").select("*")
          .eq("substitution_family", original.substitution_family).eq("movement_category", original.movement_category).eq("is_active", true);
        if (familyError) throw new Error("I couldn't check the replacement exercises.");
        catalog = (family ?? []) as unknown as UniversalSwapMovement[];
      }
      return { expected: row as unknown as AtomicSwapSnapshot, original: original as unknown as UniversalSwapMovement, catalog,
        catalogFingerprint: await swapCatalogFingerprint(original, catalog) };
    } });
  if (query.isSuccess && query.data) {
    const data = query.data;
    return <UniversalSwapConversation open={open} onOpenChange={onOpenChange} {...data}
      context={{ category: data.original.movement_category, phase: data.expected.phase, trainingAge: null,
        sport: null, ageYears: null, injuryRestrictions: null, sessionAllowed: false }}
      interpret={async message => {
        const { data: answer, error } = await supabase.functions.invoke("plan-swap", { body: {
          action: "interpret", prescriptionId: rx.id, planDate: rx.plan_date, message,
          expected: data.expected, catalogFingerprint: data.catalogFingerprint,
        } });
        if (error || answer?.error) {
          let reason = typeof answer?.error === "string" ? answer.error : "I couldn't read that answer. Nothing was saved.";
          // Function HTTP failures carry their safe athlete-facing reason in
          // the response, not in the successful invocation's data field.
          if (error?.context instanceof Response) {
            const refused = await error.context.clone().json().catch(() => null);
            if (typeof refused?.error === "string") reason = refused.error;
          }
          throw new Error(reason);
        }
        if (!Array.isArray(answer?.have) || !Array.isArray(answer?.lacks) || answer.memorySaved !== false || answer.prescriptionChanged !== false) {
          throw new Error("I couldn't check that answer. Nothing was saved.");
        }
        return { have: answer.have as string[], lacks: answer.lacks as string[] };
      }} onSaved={() => {}} />;
  }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
    <SheetHeader><SheetTitle>Swap {rx.movement_name}</SheetTitle></SheetHeader>
    {query.isError ? <p role="alert" className="py-4 text-sm text-destructive">{query.error.message}</p> :
      <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking your saved exercise…</p>}
  </SheetContent></Sheet>;
}