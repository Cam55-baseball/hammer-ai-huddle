import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedAnalysisDrills } from '@/hooks/useSavedAnalysisDrills';
import { rowToDrills, type OwnerDrillRow } from '@/lib/prescription/ownerDrills';
import { toast } from 'sonner';

/** Favorites are personal shelf saves, not activation or prescription. */
export function OwnerDrillFavorite({ row, sport, category }: { row: OwnerDrillRow; sport: string; category: string }) {
  const saved = useSavedAnalysisDrills(sport);
  const drill = rowToDrills(row).find(d => d.category === category && d.sports.some(s => s === sport));
  if (!drill) return null;
  const isSaved = saved.isSaved(drill);
  return <Button variant="ghost" size="icon" aria-label={`Save ${row.name} to Saved drills`} aria-pressed={isSaved}
    disabled={!saved.ready || saved.saving || isSaved}
    onClick={() => { void saved.save(drill).then(() => toast.success('Saved to Saved drills'), () => toast.error("Couldn't save this drill. Try again.")); }}>
    <Heart className={isSaved ? 'h-4 w-4 fill-destructive text-destructive' : 'h-4 w-4'} />
  </Button>;
}