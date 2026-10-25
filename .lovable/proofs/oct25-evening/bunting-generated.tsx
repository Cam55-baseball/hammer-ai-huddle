/** Actual builder with explicitly labelled fixture inputs; no hosted writes. */
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {buildHammerDailyPlan} from '@/lib/hammer/prescription/dailyPlan';
import {buntingVaultContent} from '../../../supabase/functions/_shared/vault/buntingContent';
import {PocketCard} from '@/components/hammer/cards/PocketCard';
import {LegacyDrillInlineLog} from '@/components/hammer/logging/LegacyDrillInlineLog';
import {AuthContext} from '@/contexts/AuthContext';
import {ConditioningRestProvider} from '@/components/hammer/cards/ConditioningRestContext';
import type {HammerAthleteContext,ContextVariable} from '@/lib/hammer/context/athleteContext';
import type {BuntCatalogItem} from '@/lib/hammer/prescription/buntingPlan';
import '@/index.css';
const vars=Object.entries({sport_primary:'baseball',position_primary:'SS',bats_hand:'S',lifecycle_band:'adult',season_phase:'off',lifting_age_years:2,weekly_availability_days:6,injury_history:[],equipment_effective:['bat','ball','field','tee','glove']}).map(([key,value])=>({key,value,missing:false,confidence:'high'}) as ContextVariable);
const ctx={variables:vars,missing:[],missingCount:0,isLoading:false,envelope:null,get:(key:string)=>vars.find(v=>v.key===key)} as HammerAthleteContext;
const catalog=buntingVaultContent().map(p=>({slug:p.slug,name:p.name,cue:p.cue,is_active:true,dosage_unit:'attempts',equipment_requirements:p.equipment,equipment:p.equipment,equipment_alternatives:p.equipment_alternatives,sport_scope:'both',min_age_years:p.min_age,season_eligibility:p.season_phases,visible_to:null})) as BuntCatalogItem[];
const plan=buildHammerDailyPlan(ctx,undefined,null,null,undefined,new Date(2026,9,26),{subscriptionModules:['baseball_5tool'],bunting:{evidence:{outcomes:[],battingGames:[{hits:1,atBats:10},{hits:2,atBats:10}],sourceIds:[]},catalog,phase:'os_q1',age:18}});
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
function App(){return <main className="p-4 space-y-4"><p className="text-xs text-muted-foreground">Generated plan with fixture inputs — no athlete records</p>{plan.blocks.filter(b=>b.drills.some(d=>d.bunt)).map(b=><ConditioningRestProvider key={b.side}><PocketCard id={`bunt-${b.side}`} category={`Hitting ${b.side}`} tone="text-primary" prescribed planDate="2026-10-26">{()=>b.drills.filter(d=>d.bunt).map(d=><section key={d.slug} className="space-y-3"><h2 className="text-lg font-semibold">{d.name}</h2><p>{d.dosage}</p><LegacyDrillInlineLog modality="hitting" name={d.name} dosage={d.dosage} setup={d.setup} cue={d.cue} stopIf={d.stopIf} storageKey={`proof-bunt-${b.side}`} completed={false} onSave={log=>localStorage.setItem(`proof-saved-${b.side}`,JSON.stringify(log))}/></section>)}</PocketCard></ConditioningRestProvider>)}</main>}
const root=document.getElementById('root');if(root)createRoot(root).render(<BrowserRouter><QueryClientProvider client={client}><AuthContext.Provider value={{user:null,loading:false,isAuthStable:true} as React.ContextType<typeof AuthContext>}><App/></AuthContext.Provider></QueryClientProvider></BrowserRouter>);