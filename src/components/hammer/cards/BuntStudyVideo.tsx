import {Play} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useVideoSuggestions} from '@/hooks/useVideoSuggestions';
import {useVideoTaxonomy} from '@/hooks/useVideoTaxonomy';
import {useVideoLightbox} from '@/components/video/useVideoLightbox';
import {buntStudyKeys,exactBuntVideos} from '@/lib/buntingVideo';
import type {DrillStep} from '@/lib/hammer/prescription/dailyPlan';
export function BuntStudyVideo({bunt,sport}:{bunt:NonNullable<DrillStep['bunt']>;sport:'baseball'|'softball'}){
 const keys=buntStudyKeys(bunt);const taxonomy=useVideoTaxonomy('hitting',{sport});
 const suggestions=useVideoSuggestions({skillDomain:'hitting',mode:'session',movementPatterns:keys,resultTags:[],contextTags:[],sport,enabled:keys.length>0});
 const {open,element}=useVideoLightbox();
 const picks=exactBuntVideos(suggestions.data??[],keys,new Map((taxonomy.data??[]).map(t=>[t.key,t.id])));const pick=picks[0];
 if(!pick)return null;
 return <div className="my-2 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{pick.video.title}</span><Button size="sm" variant="outline" onClick={()=>open(pick.video)}><Play className="mr-1 h-3 w-3"/>Watch</Button>{element}</div>;
}