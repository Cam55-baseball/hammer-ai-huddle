import {useMasteryIdentity} from '@/hooks/useMasteryIdentity';
/** Six-week plan/recap reads the ONE shared development strategy. */
export function StrategyLine({sport,today,athleteId}:{sport:'baseball'|'softball';today:string;athleteId?:string}){
 const q=useMasteryIdentity(sport,today,true,athleteId);
 if(q.isError)return <p role="alert" className="text-xs text-destructive">Couldn't read the development strategy.</p>;
 if(!q.data)return null;
 return <p className="text-sm">Strategy: {q.data.strategy.sixWeekLine} <span className="text-xs text-muted-foreground">Source: judged pillars and the top saved goal.</span></p>;
}
