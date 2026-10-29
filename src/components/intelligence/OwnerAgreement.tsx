import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { agreementRates } from '@/lib/ratings/agreement';
export function OwnerAgreement() {
  const q = useQuery({ queryKey: ['owner-rating-agreements'], queryFn: async () => {
    const {data,error} = await supabase.from('rating_agreements').select('test_key,metric_key,sport,position,agree,note,created_at').order('created_at',{ascending:false}).limit(10000);
    if(error) throw error; return data ?? [];
  }});
  const groups = agreementRates(q.data ?? []);
  return <section className="space-y-4 py-4" aria-label="Coach agreement">
    <h2 className="text-xl font-semibold">Do You Agree?</h2>
    {q.isLoading ? <p>Checking coach answers…</p> : q.isError ? <><p role="alert">We couldn’t load coach answers. This is not an empty result.</p><Button variant="outline" onClick={()=>q.refetch()}>Try again</Button></> : !groups.length ? <div className="space-y-2 border-y border-border py-6"><h3 className="text-lg font-semibold">No Coach Answers Yet</h3><p className="text-base text-muted-foreground">When a coach opens a connected player’s recorded test or rating and answers “Do you agree?”, their answer appears here. You’ll see agreement by test, sport and position, plus their notes. Answers do not change ratings.</p></div> : <>
      {groups.map(g=><div key={g.key} className="space-y-2 border-b border-border py-3"><h3 className="break-words font-semibold">{g.test_key.replace(/_/g,' ')} · {g.metric_key.replace(/_/g,' ')}</h3><p>{Math.round(g.rate*100)}% agree · {g.agreed} of {g.total} coach answers</p><p className="text-muted-foreground">{g.sport} · {g.position}</p><progress className="h-2 w-full accent-primary" value={g.agreed} max={g.total}/></div>)}
      <h3 className="text-lg font-semibold">Recent Coach Notes</h3>{q.data?.filter(r=>r.note?.trim()).slice(0,20).map((r,i)=><div className="border-b border-border py-2" key={i}><p className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · {r.agree?'Agreed':'Disagreed'}</p><p className="break-words">{r.note}</p></div>)}
    </>}
  </section>;
}