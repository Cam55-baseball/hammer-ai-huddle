import {useMasteryIdentity} from '@/hooks/useMasteryIdentity';
export function MasteryIdentityPanel({sport}:{sport:'baseball'|'softball'}){
 const query=useMasteryIdentity(sport,new Date().toLocaleDateString('en-CA'));
 const data=query.data;const window=data?.batting.latest;
 return <section aria-label="Player mastery identity" className="space-y-3 border-y border-border py-4">
  <h2 className="text-lg font-semibold">Your academy of mastery</h2>
  {query.isError?<p role="alert" className="text-sm text-destructive">Couldn't read your identity evidence. No new identity was judged.</p>:query.isPending?<p className="text-sm text-muted-foreground">Checking recorded evidence…</p>:<>
   <div className="space-y-3 text-sm">
    <div><h3 className="font-medium">Batting average · {window?'Measured':'Need more data'}</h3>{window?<p className="text-muted-foreground">Average: {(window.hits/window.atBats).toFixed(3)} · {window.hits} hits / {window.atBats} at-bats. Window: AB {window.start}–{window.end}. Source: entered game at-bats, {window.from}–{window.through}.</p>:<p className="text-muted-foreground">No complete batting window yet.</p>}<p className="text-muted-foreground">Current window: AB {data?.batting.current.start}–{data?.batting.current.end} · {data?.batting.current.sample} / {data?.batting.current.size} recorded at-bats. Source: completed game logs.</p></div>
    <div><h3 className="font-medium">Home-run power · {data?.traits.powerStatus??'Need more data'}</h3>{window&&<p className="text-muted-foreground">Home runs: {window.homeRuns} in AB {window.start}–{window.end}. Source: entered game at-bats, {window.from}–{window.through}.</p>}{!data?.settings?.elite_home_runs&&<p className="text-muted-foreground">Owner power cutoff not set.</p>}</div>
    <div><h3 className="font-medium">Speed · {data?.speed.status??'Need more data'}</h3>{data?.speed.evidence.map(e=><p key={e.id} className="text-muted-foreground">{e.measure.replace(/_/g,' ')}: {e.value} {e.unit}; grade: {e.grade}. Source: {e.source}, {e.date}.</p>)}{!data?.speed.evidence.length&&<p className="text-muted-foreground">No qualifying graded speed evidence yet.</p>}</div>
    {['Elite balls in play','Impeccable defense','Position-specific arm'].map(label=><div key={label}><h3 className="font-medium">{label} · Need more data</h3><p className="text-muted-foreground">This pillar has not been certified from its required evidence.</p></div>)}
   </div>
  </>}
 </section>;
}