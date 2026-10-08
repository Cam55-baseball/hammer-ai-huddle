/** Public page a parent opens from the email link to read and e-sign the 13–17 waiver (legal_v2). */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { SignaturePad } from "@/components/parent/SignaturePad";
import { callTeenWaiver, TEEN_WAIVER_ERRORS } from "@/lib/legal/teenWaiver";

const RELATIONSHIPS = ["Mother", "Father", "Legal guardian", "Other natural guardian"];

export default function ParentWaiverSign() {
  const { token = "" } = useParams();
  const [doc, setDoc] = useState<{ title: string; body: string } | null>(null);
  const [teen, setTeen] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rel, setRel] = useState("");
  const [adult, setAdult] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    callTeenWaiver<{ doc: any; teen_first_name: string | null }>("view", { token })
      .then((r) => { setDoc(r.doc); setTeen(r.teen_first_name); })
      .catch((e) => setFatal(TEEN_WAIVER_ERRORS[e.code] ?? TEEN_WAIVER_ERRORS.invalid_link));
  }, [token]);

  const ok = name.trim().split(/\s+/).length >= 2 && !!rel && adult && !!sig;
  const sign = async () => {
    setBusy(true); setErr(null);
    try { await callTeenWaiver("sign", { token, name: name.trim(), relationship: rel, adult, signature: sig }); setDone(true); }
    catch (e: any) { setErr(TEEN_WAIVER_ERRORS[e.code] ?? TEEN_WAIVER_ERRORS.failed); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto w-full max-w-md space-y-5 px-5 pb-10 pt-[calc(1.25rem+var(--safe-top,0px))]">
      <h1 className="text-2xl font-semibold">Parent or guardian waiver</h1>
      {fatal && <p role="alert" className="text-sm">{fatal}</p>}
      {done && <div role="status" className="rounded-lg border p-4"><p className="font-semibold">Signed. Thank you.</p><p className="mt-1 text-sm text-muted-foreground">{teen ?? "Your player"}'s training plan is now open. You can close this page.</p></div>}
      {doc && !done && (
        <>
          <p className="text-sm text-muted-foreground">{teen ? `${teen} is` : "Your player is"} under 18 and wants to use the Hammers Modality training plan. Please read the waiver and sign below.</p>
          <article className="rounded-lg border p-3 text-sm"><LegalMarkdown body={doc.body} /></article>
          <div className="space-y-1.5"><Label htmlFor="pw-name">Your full legal name</Label><Input id="pw-name" className="h-11" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Your relationship to the player</legend>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIPS.map((r) => <Button key={r} type="button" variant={rel === r ? "default" : "outline"} className="min-h-[44px] whitespace-normal" aria-pressed={rel === r} onClick={() => setRel(r)}>{r}</Button>)}
            </div>
          </fieldset>
          <label className="flex min-h-[44px] items-start gap-3 text-sm"><Checkbox checked={adult} onCheckedChange={(v) => setAdult(v === true)} className="mt-0.5" /><span>I am 18 or older and I am this player's parent or legal guardian.</span></label>
          <div className="space-y-1.5"><p className="text-sm font-medium">Sign here</p><SignaturePad onChange={setSig} /></div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button className="h-12 w-full text-base" disabled={!ok || busy} onClick={sign}>{busy ? "Saving…" : "Sign the waiver"}</Button>
        </>
      )}
    </main>
  );
}
