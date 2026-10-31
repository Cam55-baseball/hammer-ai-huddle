import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type View = { state: string; area?: string; first_name?: string | null };

/** Parent link: confirm an under-18 player's injury is healed and full go. Two Confirms. */
export default function ParentFullGo() {
  const { token = '' } = useParams();
  const [view, setView] = useState<View | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void supabase.functions.invoke('injury-full-go', { body: { action: 'view', token } })
      .then(({ data, error }) => setView(error ? { state: 'error' } : data as View));
  }, [token]);
  const who = view?.first_name || 'Your player';
  const confirm = async () => {
    setBusy(true); setError('');
    const { data, error } = await supabase.functions.invoke('injury-full-go', { body: { action: 'confirm', token } });
    setBusy(false);
    if (error || !data?.state) { setError("Couldn't save that. Nothing was changed. Try again."); return; }
    setView(data as View);
  };
  return <main className="mx-auto max-w-md space-y-4 p-6">
    <h1 className="text-xl font-bold">Healed and full go</h1>
    {!view ? <p>Opening…</p>
      : view.state === 'ok' ? step === 1
        ? <><p>{who} says their {view.area} is healed and they are full go. Mark their {view.area} as healed and full go?</p>
          <div className="flex gap-2"><Button variant="outline" onClick={() => window.close()}>Cancel</Button><Button onClick={() => setStep(2)}>Confirm</Button></div></>
        : <><p>Are you sure? This removes {who}'s {view.area} limits and rebuilds their plan the next time they open the app.</p>
          <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)} disabled={busy}>Cancel</Button><Button onClick={confirm} disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</Button></div></>
      : view.state === 'confirmed' ? <p>Thanks. {who}'s {view.area} is marked healed and full go. Their plan rebuilds the next time they open the app.</p>
      : view.state === 'expired' ? <p>This link has expired. Ask your player to send it again.</p>
      : view.state === 'already_done' ? <p>This was already confirmed. Nothing else to do.</p>
      : <p>This link isn't valid. Nothing was changed.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </main>;
}
