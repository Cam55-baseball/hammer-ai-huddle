import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { equipmentLabel } from "@/lib/hammer/context/equipmentVocabulary";
import { answerSwapConversation, startSwapConversation, type SwapConversation } from "@/lib/prescription/swapConversation";
import { commitAtomicSwap, type AtomicSwapSnapshot, type AtomicSwapTransport } from "@/lib/prescription/atomicSwap";
import { previewUniversalSwap, type UniversalSwapContext, type UniversalSwapMovement } from "@/lib/prescription/universalSwapCandidates";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expected: AtomicSwapSnapshot;
  original: UniversalSwapMovement;
  catalog: readonly UniversalSwapMovement[];
  context: Omit<UniversalSwapContext, "availability">;
  /** Absence blocks all writes. Never substitute the existing direct-write alternative hook. */
  transport?: AtomicSwapTransport;
  interpret?: (message: string) => Promise<{ have: string[]; lacks: string[] }>;
  onSaved: () => void;
}

/** Staged presentation, not mounted in athlete routes until the server boundary is proved.
 * No model output, remembered gear, or candidate preview has persistence authority.
 */
export function UniversalSwapConversation(props: Props) {
  const visit = `${props.expected.user_id}:${props.expected.id}:${props.expected.plan_date}:${props.expected.updated_at}`;
  return <SwapVisit key={visit} {...props} />;
}

function SwapVisit({ open, onOpenChange, expected, original, catalog, context, transport, interpret, onSaved }: Props) {
  const [draft, setDraft] = useState<SwapConversation>(() => startSwapConversation(expected.user_id, expected.id, expected.plan_date));
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const [understood, setUnderstood] = useState<{ have: string[]; lacks: string[] } | null>(null);
  const active = useRef(true);
  const saving = useRef(false);
  const attempted = useRef(false);
  const openEpoch = useRef(0);
  useEffect(() => {
    openEpoch.current += 1;
    active.current = open;
    setReading(false);
    if (!open && !attempted.current) {
      setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date));
      setSelected([]); setError(null); setSavedReason(null);
      setMessage(""); setUnderstood(null);
    }
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
      setSelected(draft.step === "missing" ? understood?.have ?? [] : []); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Check your answer."); }
  };
  const readAnswer = async () => {
    if (!interpret || reading || !message.trim()) return;
    const epoch = openEpoch.current;
    setReading(true); setError(null);
    try {
      const answer = await interpret(message);
      if (!active.current || openEpoch.current !== epoch) return;
      setUnderstood(answer); setSelected(answer.lacks);
    } catch (cause) {
      if (active.current && openEpoch.current === epoch) setError(cause instanceof Error ? cause.message : "I couldn't read that answer. Choose the listed items.");
    } finally { if (active.current && openEpoch.current === epoch) setReading(false); }
  };
  const close = (next: boolean) => {
    if (pending || reading) return;
    if (!next) {
      setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date));
      setSelected([]); setError(null); setSavedReason(null);
      setMessage(""); setUnderstood(null);
    }
    onOpenChange(next);
  };
  const save = async (slug: string) => {
    if (!transport || saving.current || attempted.current || !preview?.candidates.some(value => value.movement.slug === slug)) return;
    saving.current = true;
    attempted.current = true;
    const requestEpoch = openEpoch.current;
    setPending(true); setError(null);
    try {
      const result = await commitAtomicSwap(draft, expected, slug, crypto.randomUUID(), transport);
      if (!active.current || requestEpoch !== openEpoch.current) {
        setUncertain(true);
        setError("Your plan may have changed while Swap was closed. Reload your plan before trying again.");
        return;
      }
      setSavedReason(result.reason);
      onSaved();
    } catch {
      if (active.current || requestEpoch !== openEpoch.current) {
        setUncertain(true);
        setError("I couldn't confirm what saved. Reload your plan before trying again.");
      }
    } finally {
      saving.current = false;
      setPending(false);
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
            {draft.step === "missing" && interpret && <div className="space-y-2">
              <Textarea aria-label="Tell Hammers what you have today" value={message} maxLength={600}
                onChange={event => setMessage(event.target.value)} placeholder="I don't have a barbell today, but I have dumbbells." disabled={reading} />
              <Button variant="outline" disabled={reading || !message.trim()} onClick={() => void readAnswer()}>
                {reading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Read my answer
              </Button>
              {understood && <p role="status" className="text-sm">I understood these missing items: {understood.lacks.map(equipmentLabel).join(", ")}. Check your selections below.</p>}
            </div>}
            <div className="space-y-2">
              {requirements.filter(item => draft.step === "missing" || !draft.lacks.includes(item)).map(item =>
                <label key={item} className="flex min-h-11 items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Checkbox checked={selected.includes(item)} onCheckedChange={checked => setSelected(current =>
                    checked === true ? [...current, item] : current.filter(value => value !== item))} />
                  <span className="break-words">{equipmentLabel(item)}</span>
                </label>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.step === "available" && <Button variant="ghost" onClick={() => { setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date)); setSelected([]); setError(null); setUnderstood(null); }}><ArrowLeft className="mr-2 h-4 w-4" />Start again</Button>}
              <Button disabled={reading || (draft.step === "missing" && selected.length === 0)} onClick={advance}>
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
            <Button variant="ghost" disabled={pending || uncertain} onClick={() => { setDraft(startSwapConversation(expected.user_id, expected.id, expected.plan_date)); setSelected([]); setError(null); setUnderstood(null); }}><ArrowLeft className="mr-2 h-4 w-4" />Start again</Button>
          </>}
        </>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </SheetContent>
  </Sheet>;
}