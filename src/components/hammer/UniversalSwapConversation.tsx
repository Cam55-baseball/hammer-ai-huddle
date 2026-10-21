import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { equipmentLabel } from "@/lib/hammer/context/equipmentVocabulary";
import { answerSwapConversation, startSwapConversation, type SwapConversation } from "@/lib/prescription/swapConversation";
import { commitAtomicSwap, type AtomicSwapSnapshot, type AtomicSwapTransport } from "@/lib/prescription/atomicSwap";
import { previewUniversalSwap, type UniversalSwapContext, type UniversalSwapMovement } from "@/lib/prescription/universalSwapCandidates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expected: AtomicSwapSnapshot;
  original: UniversalSwapMovement;
  catalog: readonly UniversalSwapMovement[];
  context: Omit<UniversalSwapContext, "availability">;
  /** Absence blocks all writes. Never substitute the existing direct-write alternative hook. */
  transport?: AtomicSwapTransport;
  onSaved: () => void;
}

/** Staged presentation, not mounted in athlete routes until the server boundary is proved.
 * No model output, remembered gear, or candidate preview has persistence authority.
 */
export function UniversalSwapConversation(props: Props) {
  const visit = `${props.expected.user_id}:${props.expected.id}:${props.expected.plan_date}:${props.expected.updated_at}`;
  return <SwapVisit key={visit} {...props} />;
}

function SwapVisit({ open, onOpenChange, expected, original, catalog, context, transport, onSaved }: Props) {
  const [draft, setDraft] = useState<SwapConversation>(() => startSwapConversation(expected.user_id, expected.id, expected.plan_date));
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const active = useRef(true);
  const saving = useRef(false);
  const attempted = useRef(false);
  useEffect(() => {
    active.current = open;
    return () => { active.current = false; };
  }, [open]);
  const [savedReason, setSavedReason] = useState<string | null>(null);
  const requirements = [...new Set((draft.step === "missing" ? original.equipment_requirements ?? [] :
    catalog.filter(row => row.primary_adaptation === original.primary_adaptation && row.movement_category === context.category)
      .flatMap(row => row.equipment_requirements ?? [])).filter(item => !["none", "bodyweight"].includes(item)))];
  const preview = draft.step === "ready" ? previewUniversalSwap(original, expected, catalog, { ...context,
    availability: { have: draft.have, lacks: draft.lacks, confirmed: true } }) : null;

  const advance = () => {
    try {
      if (draft.step !== "missing" && draft.step !== "available") return;
      setDraft(answerSwapConversation(draft, { step: draft.step, items: selected }));
      setSelected([]); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Check your answer."); }
  };
  const close = (next: boolean) => {
    if (pending) return;
    if (!next) {
      setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date));
      setSelected([]); setError(null); setSavedReason(null);
    }
    onOpenChange(next);
  };
  const save = async (slug: string) => {
    if (!transport || saving.current || attempted.current || !preview?.candidates.some(value => value.movement.slug === slug)) return;
    saving.current = true;
    attempted.current = true;
    setPending(true); setError(null);
    try {
      const result = await commitAtomicSwap(draft, expected, slug, crypto.randomUUID(), transport);
      if (!active.current) return;
      setSavedReason(result.reason);
      onSaved();
    } catch {
      if (active.current) {
        setUncertain(true);
        setError("I couldn't confirm what saved. Reload your plan before trying again.");
      }
    } finally {
      saving.current = false;
      if (active.current) setPending(false);
    }
  };

  return <Sheet open={open} onOpenChange={close}>
    <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
      <SheetHeader className="pr-8 text-left">
        <SheetTitle className="break-words text-base">Swap {original.name}</SheetTitle>
        <SheetDescription>Your original session stays until a checked swap is saved.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 py-4">
        {savedReason ? <div role="status" className="space-y-2"><p className="font-semibold">Swap and memory saved</p><p className="text-sm">Because: {savedReason}</p></div> : <>
          {draft.step === "missing" || draft.step === "available" ? <>
            <p className="text-xs text-muted-foreground">Question {draft.step === "missing" ? "1" : "2"} of 3</p>
            <h2 className="text-sm font-semibold">{draft.step === "missing" ? "What is missing today?" : "What can you use safely today?"}</h2>
            <div className="space-y-2">
              {requirements.filter(item => draft.step === "missing" || !draft.lacks.includes(item)).map(item =>
                <label key={item} className="flex min-h-11 items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Checkbox checked={selected.includes(item)} onCheckedChange={checked => setSelected(current =>
                    checked === true ? [...current, item] : current.filter(value => value !== item))} />
                  <span className="break-words">{equipmentLabel(item)}</span>
                </label>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.step === "available" && <Button variant="ghost" onClick={() => { setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date)); setSelected([]); setError(null); }}><ArrowLeft className="mr-2 h-4 w-4" />Start again</Button>}
              <Button disabled={draft.step === "missing" && selected.length === 0} onClick={advance}>
                {draft.step === "available" && !selected.length ? "None of these" : "Continue"}<ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </> : draft.step === "scope" ? <>
            <p className="text-xs text-muted-foreground">Question 3 of 3</p>
            <h2 className="text-sm font-semibold">Is the missing item just for today or always?</h2>
            <div className="flex flex-wrap gap-2">
              {(["today", "always"] as const).map(scope => <Button key={scope} variant="outline" onClick={() => setDraft(answerSwapConversation(draft, { step: "scope", scope }))}>{scope === "today" ? "Just today" : "Always"}</Button>)}
            </div>
          </> : <>
            <h2 className="text-sm font-semibold">{preview?.candidates.length ? "Same training job, same amount of work" : "No checked replacement available"}</h2>
            {preview?.candidates.map(({ movement }) => <Button key={movement.slug} variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" disabled={pending || uncertain || !transport} onClick={() => void save(movement.slug)}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Repeat2 className="mr-2 h-4 w-4 shrink-0" />}{movement.name}
            </Button>)}
            <p className="text-sm text-muted-foreground">{!transport ? "Swap saving is not available yet. Your session and equipment memory are unchanged." : !preview?.candidates.length ? "Your session is unchanged. Don't replace it with different work." : "Your answer will be saved with the checked replacement."}</p>
            <Button variant="ghost" disabled={pending || uncertain} onClick={() => { setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date)); setSelected([]); setError(null); }}><ArrowLeft className="mr-2 h-4 w-4" />Start again</Button>
          </>}
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </SheetContent>
  </Sheet>;
}