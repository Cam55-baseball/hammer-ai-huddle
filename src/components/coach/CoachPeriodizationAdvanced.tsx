import { CoachPeriodizationEditor } from './CoachPeriodizationEditor';
export function CoachPeriodizationAdvanced({athleteId}:{athleteId:string}) {
 return <details className="border-t border-border pt-3"><summary className="min-h-11 cursor-pointer text-sm font-medium">Advanced · Periodization tuning</summary><CoachPeriodizationEditor athleteId={athleteId}/></details>;
}
