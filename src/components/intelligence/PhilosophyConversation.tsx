import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PHILOSOPHY_ENTRY, PHILOSOPHY_REQUEST, parsePhilosophyReply, philosophyChanges, type PhilosophyReply } from '@/lib/intelligence/philosophyConversation';
import { latestThreadId } from '@/lib/hammer/oneConversation';
type Turn = {role:'user'|'assistant';text:string;review?:PhilosophyReply;confirmed?:string};
export function PhilosophyConversation({onSaved}:{onSaved:()=>void}) {
  const [turns,setTurns]=useState<Turn[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[thread,setThread]=useState<string|null>(null);
  const [saved,setSaved]=useState<string|null>(null);
  useEffect(()=>{let alive=true;void(async()=>{try{
    const {data}=await supabase.auth.getSession();const uid=data.session?.user.id;if(!uid)throw Error('Sign in to open your saved conversation.');
    const tid=await latestThreadId(uid);if(!alive)return;setThread(tid);
    if(tid){const {data:rows,error}=await supabase.from('recall_messages').select('role,parts').eq('thread_id',tid).eq('user_id',uid).filter('parts','cs',JSON.stringify([{entry:PHILOSOPHY_ENTRY}])).order('created_at',{ascending:true}).order('role',{ascending:false});if(error)throw error;
      const history:Turn[]=[];for(const row of rows??[]){const parts=row.parts as unknown as Array<{entry?:string;text?:string;review?:PhilosophyReply;confirmed?:string}>;const p=Array.isArray(parts)?parts[0]:null;if(p?.entry===PHILOSOPHY_ENTRY&&p.text)history.push({role:row.role==='assistant'?'assistant':'user',text:p.text,review:p.review,confirmed:p.confirmed});}
      if(alive){setTurns(history);setSaved(history[history.length-1]?.confirmed??null);}
    }
  }catch{if(alive)setError('We couldn’t load your saved conversation. Try reopening this page.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[]);
  const store=async(next:Turn[])=>{
    const {data}=await supabase.auth.getSession();const uid=data.session?.user.id;if(!uid)throw Error('Sign in again. Nothing was applied.');
    let tid=thread;if(!tid){const {data,error}=await supabase.from('recall_threads').insert({user_id:uid,title:'Owner philosophy conversation'}).select('id').single();if(error)throw error;tid=data.id;setThread(tid);}
    const {error}=await supabase.from('recall_messages').insert(next.map(t=>({thread_id:tid,user_id:uid,role:t.role,parts:JSON.parse(JSON.stringify([{type:'text',entry:PHILOSOPHY_ENTRY,text:t.text,...(t.review?{review:t.review}:{}),...(t.confirmed?{confirmed:t.confirmed}:{})}])) as Json})));if(error)throw error;
  };
  const send=async()=>{if(!draft.trim()||busy||loading)return;setBusy(true);setError('');setSaved(null);const question=draft.trim();try{
    const {data,error}=await supabase.functions.invoke('hammer-chat',{body:{messages:[...turns.slice(-20).map(t=>({role:t.role,content:t.text})),{role:'user',content:`${PHILOSOPHY_REQUEST}\n\nOwner says: ${question}`} ]}});if(error)throw error;
    const review=parsePhilosophyReply(data?.reply??'');const next:Turn[]=[{role:'user',text:question},{role:'assistant',text:review.reply,review}];
    await store(next);setTurns(old=>[...old,...next]);setDraft('');
  }catch(e){setError(e instanceof Error ? e.message : 'Hammers couldn’t complete and save this reply. Nothing was applied.');}finally{setBusy(false);}};
  const review=turns[turns.length-1]?.review;const proposal=review?.proposal;
  const confirm=async()=>{if(!proposal||busy||saved)return;setBusy(true);setError('');try{
    const {data:id,error}=await supabase.rpc('owner_save_principle',{_principle:null,_body:proposal.body,_sport:proposal.sport,_area:proposal.area,_situation:'owner-philosophy',_applies_when:proposal.applies_when,_not_when:proposal.not_when,_connected_work:proposal.connected_work,_evidence_kind:'experience',_evidence_note:proposal.benefit});if(error||!id)throw error??Error('No saved principle was returned.');
    setSaved(id);
    const {data:row,error:readError}=await supabase.from('coaching_principle_versions').select('body,version').eq('principle_id',id).eq('version',1).single();if(readError||row.body!==proposal.body)throw Error('The save returned a principle, but we could not verify it. Do not confirm again; check Your principles.');
    try{const confirmation:Turn={role:'assistant',text:`Confirmed — principle version ${row.version} saved. No standards, safety limits or dose changed.`,confirmed:id};await store([confirmation]);setTurns(old=>[...old,confirmation]);}catch{setError('The principle was saved, but its conversation receipt could not be saved. Do not confirm again.');}
    onSaved();
  }catch(e){setError(e instanceof Error?e.message:'The principle could not be saved. Nothing was confirmed.');}finally{setBusy(false);}};
  return <section aria-label="Philosophy conversation" className="space-y-4 border-y border-border py-5">
    <h2 className="text-xl font-semibold">Philosophy Conversation</h2>
    {loading?<p>Opening your saved conversation…</p>:turns.map((t,i)=><div key={i} className="space-y-2 border-b border-border py-3"><p className="text-sm font-semibold text-muted-foreground">{t.role==='user'?'You':'Hammers'}</p><p className="whitespace-pre-wrap break-words text-base">{t.text}</p>{t.review?.questions.map(q=><p className="font-medium" key={q}>{q}</p>)}</div>)}
    {proposal&&!saved&&<div className="space-y-4 py-3" aria-label="Proposed changes"><h3 className="text-lg font-semibold">Exactly What Would Change</h3>{philosophyChanges(proposal).map(c=><div key={c.title}><h4 className="font-semibold">{c.title}</h4><p className="text-sm text-muted-foreground">{c.where}</p><p className="break-words">{c.change}</p></div>)}<p><strong>What it could help:</strong> {proposal.benefit}</p><p className="text-muted-foreground">Nothing applied yet. Existing sport, equipment, pain, rest and season rules still win.</p><Button disabled={busy} onClick={confirm}>Confirm</Button></div>}
    {saved&&<p role="status">Principle saved. Its current version is in Your principles.</p>}
    <Label htmlFor="philosophy-point">Your philosophy point or answer</Label><Textarea id="philosophy-point" className="min-h-28 text-base" value={draft} onChange={e=>setDraft(e.target.value)} />
    {error&&<p role="alert" className="break-words text-destructive">{error}</p>}
    <Button onClick={send} disabled={loading||busy||!draft.trim()}>{busy?'Working…':'Send to Hammers'}</Button>
  </section>;
}