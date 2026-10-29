import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PHILOSOPHY_ENTRY, PHILOSOPHY_REQUEST, parsePhilosophyReply, type PhilosophyReply } from '@/lib/intelligence/philosophyConversation';
import { latestThreadId } from '@/lib/hammer/oneConversation';
import { cueChanges, type PhilosophyReceipt } from '@/lib/intelligence/philosophySettings';
type Turn = {role:'user'|'assistant';text:string;review?:PhilosophyReply;confirmed?:string;receipt?:PhilosophyReceipt};
export function PhilosophyConversation({onSaved}:{onSaved:()=>void}) {
  const [turns,setTurns]=useState<Turn[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[thread,setThread]=useState<string|null>(null);
  const [saved,setSaved]=useState<string|null>(null);
  const [receipt,setReceipt]=useState<PhilosophyReceipt|null>(null);
  const [settings,setSettings]=useState<Array<{id:string;name:string;cue:string|null}>>([]);
  const [settingId,setSettingId]=useState('');
  const [replacement,setReplacement]=useState('');
  useEffect(()=>{let alive=true;void(async()=>{try{
    const {data}=await supabase.auth.getSession();const uid=data.session?.user.id;if(!uid)throw Error('Sign in to open your saved conversation.');
    const tid=await latestThreadId(uid);if(!alive)return;setThread(tid);
    const {data:catalog,error:catalogError}=await supabase.from('wk_movement_catalog').select('id,name,cue').not('visible_to','is',null).order('name').limit(100);if(catalogError)throw catalogError;if(alive)setSettings(catalog??[]);
    if(tid){const {data:rows,error}=await supabase.from('recall_messages').select('role,parts').eq('thread_id',tid).eq('user_id',uid).filter('parts','cs',JSON.stringify([{entry:PHILOSOPHY_ENTRY}])).order('created_at',{ascending:true}).order('role',{ascending:false});if(error)throw error;
      const history:Turn[]=[];for(const row of rows??[]){const parts=row.parts as unknown as Array<{entry?:string;text?:string;review?:PhilosophyReply;confirmed?:string;receipt?:PhilosophyReceipt}>;const p=Array.isArray(parts)?parts[0]:null;if(p?.entry===PHILOSOPHY_ENTRY&&p.text)history.push({role:row.role==='assistant'?'assistant':'user',text:p.text,review:p.review,confirmed:p.confirmed,receipt:p.receipt});}
      if(alive){setTurns(history);const last=history[history.length-1];setReceipt(last?.receipt??null);setSaved(last?.receipt?.principle_id??last?.confirmed??null);}
    }
  }catch{if(alive)setError('We couldn’t load your saved conversation. Try reopening this page.');}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[]);
  const store=async(next:Turn[])=>{
    const {data}=await supabase.auth.getSession();const uid=data.session?.user.id;if(!uid)throw Error('Sign in again. Nothing was applied.');
    let tid=thread;if(!tid){const {data,error}=await supabase.from('recall_threads').insert({user_id:uid,title:'Owner philosophy conversation'}).select('id').single();if(error)throw error;tid=data.id;setThread(tid);}
    const {error}=await supabase.from('recall_messages').insert(next.map(t=>({thread_id:tid,user_id:uid,role:t.role,parts:JSON.parse(JSON.stringify([{type:'text',entry:PHILOSOPHY_ENTRY,text:t.text,...(t.review?{review:t.review}:{}),...(t.confirmed?{confirmed:t.confirmed}:{})}])) as Json})));if(error)throw error;
  };
  const send=async()=>{if(!draft.trim()||busy||loading)return;setBusy(true);setError('');setSaved(null);const question=draft.trim();try{
    const setting=settings.find(s=>s.id===settingId);if(!setting)throw Error('Choose an existing TEST cue first.');
    const {data,error}=await supabase.functions.invoke('hammer-chat',{body:{messages:[...turns.slice(-20).map(t=>({role:t.role,content:t.text})),{role:'user',content:`${PHILOSOPHY_REQUEST}\nEDITOR_SETTING=${JSON.stringify({id:setting.id,before:setting.cue??'',name:setting.name})}\n\nOwner says: ${question}`} ]}});if(error)throw error;
    const review=parsePhilosophyReply(data?.reply??'');if(review.proposal){const changes=cueChanges(replacement.trim()?[{target:'wk_movement_catalog',id:setting.id,field:'cue',before:setting.cue??'',after:replacement}]:review.proposal.changes);if(changes[0].id!==setting.id||changes[0].before!==(setting.cue??''))throw Error('The proposal did not match the selected saved cue. Ask again.');review.proposal.changes=changes;}const next:Turn[]=[{role:'user',text:question},{role:'assistant',text:review.reply,review}];
    await store(next);setTurns(old=>[...old,...next]);setDraft('');
  }catch(e){setError(e instanceof Error ? e.message : 'Hammers couldn’t complete and save this reply. Nothing was applied.');}finally{setBusy(false);}};
  const review=turns[turns.length-1]?.review;const proposal=review?.proposal;
  const confirm=async()=>{if(!proposal||busy||saved)return;setBusy(true);setError('');try{
    const changes=cueChanges(proposal.changes);if(!thread)throw Error('Save this conversation before Confirm.');
    const {data,error}=await supabase.rpc('owner_confirm_test_cue',{p_thread:thread,p_body:proposal.body,p_sport:proposal.sport,p_area:proposal.area,p_change:JSON.parse(JSON.stringify(changes[0]))});if(error||!data)throw error??Error('No atomic receipt was returned.');
    const r=data as unknown as PhilosophyReceipt;setReceipt(r);setSaved(r.principle_id);setTurns(old=>[...old,{role:'assistant',text:`Confirmed — version ${r.version}. TEST cue applied; dose and safety unchanged.`,receipt:r}]);
    onSaved();
  }catch(e){setError(e instanceof Error?e.message:'The principle could not be saved. Nothing was confirmed.');}finally{setBusy(false);}};
  const undo=async()=>{if(!receipt||receipt.undone||busy)return;setBusy(true);setError('');try{const {data,error}=await supabase.rpc('owner_undo_test_cue',{p_version:receipt.version_id});if(error||!data)throw error??Error('Undo was not confirmed.');const r=data as unknown as PhilosophyReceipt;setReceipt(r);setTurns(old=>[...old,{role:'assistant',text:'Undone — the exact previous TEST cue is restored.',receipt:r}]);onSaved();}catch(e){setError(e instanceof Error?e.message:'Undo failed.');}finally{setBusy(false);}};
  return <section aria-label="Philosophy conversation" className="space-y-4 border-y border-border py-5">
    <h2 className="text-xl font-semibold">Philosophy Conversation</h2>
    {loading?<p>Opening your saved conversation…</p>:turns.map((t,i)=><div key={i} className="space-y-2 border-b border-border py-3"><p className="text-sm font-semibold text-muted-foreground">{t.role==='user'?'You':'Hammers'}</p><p className="whitespace-pre-wrap break-words text-base">{t.text}</p>{t.review?.questions.map(q=><p className="font-medium" key={q}>{q}</p>)}</div>)}
    {proposal&&!saved&&<div className="space-y-4 py-3" aria-label="Proposed changes"><h3 className="text-lg font-semibold">Exactly What Would Change</h3>{proposal.changes?.map(c=><div key={c.id}><h4 className="font-semibold">Exercise builder → Key cue · TEST accounts only</h4><p className="break-words">From: {c.before}</p><p className="break-words">To: {c.after}</p></div>)}<p>Principle: new version in Coaching Console. Standards, tags, fix-it selection, weights and minimums: unchanged.</p><p><strong>What it could help:</strong> {proposal.benefit}</p><p className="text-muted-foreground">Nothing applied yet. Existing sport, equipment, pain, rest and season rules still win.</p><Button disabled={busy||!proposal.changes?.length} onClick={confirm}>Confirm</Button></div>}
    {receipt&&<div role="status"><p>Receipt · principle version {receipt.version} · {receipt.undone?'Previous cue restored':'TEST cue applied'}</p>{!receipt.undone&&<Button variant="outline" disabled={busy} onClick={undo}>Undo</Button>}</div>}
    <Label htmlFor="philosophy-setting">Existing TEST cue</Label><select id="philosophy-setting" className="h-10 w-full rounded-md border border-input bg-background" value={settingId} onChange={e=>setSettingId(e.target.value)}><option value="">Choose a TEST exercise</option>{settings.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <Label htmlFor="philosophy-cue-wording">Exact replacement cue</Label><Textarea id="philosophy-cue-wording" value={replacement} onChange={e=>setReplacement(e.target.value)} maxLength={500} />
    <Label htmlFor="philosophy-point">Your philosophy point or answer</Label><Textarea id="philosophy-point" className="min-h-28 text-base" value={draft} onChange={e=>setDraft(e.target.value)} />
    {error&&<p role="alert" className="break-words text-destructive">{error}</p>}
    <Button onClick={send} disabled={loading||busy||!draft.trim()}>{busy?'Working…':'Send to Hammers'}</Button>
  </section>;
}