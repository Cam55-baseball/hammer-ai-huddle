import { Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFavoriteMeals, type FavoriteMeal } from '@/hooks/useFavoriteMeals';

interface Props {
  /** Called with the chosen favorite so the surface can prefill its fields. */
  onPick: (favorite: FavoriteMeal) => void;
  /** Optional empty-state line override. */
  emptyText?: string;
  allowDelete?: boolean;
}

/**
 * Favorite meals, reachable from every meal-logging surface.
 * Picking one prefills the log so the athlete can still adjust before saving.
 */
export function FavoriteMealsPicker({ onPick, emptyText, allowDelete = true }: Props) {
  const { favorites, loading, markUsed, removeFavorite } = useFavoriteMeals();

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 flex-1 min-w-[110px]" />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyText ??
          'No favorite meals yet. Tick “Save as favorite” when you log a meal and it will show up here.'}
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {favorites.map((fav) => (
        <div key={fav.id} className="relative flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-auto py-2 px-3 flex-col items-start min-w-[120px] max-w-[170px]
                       hover:bg-amber-500/10 hover:border-amber-500/50"
            onClick={() => {
              markUsed(fav);
              onPick(fav);
            }}
          >
            <span className="text-xs font-medium truncate w-full text-left">{fav.meal_name}</span>
            <span className="text-[10px] text-muted-foreground">
              {fav.calories ?? 0} cal · {Math.round(Number(fav.protein_g ?? 0))}g protein
            </span>
          </Button>
          {allowDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${fav.meal_name} from favorites`}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border text-destructive"
              onClick={() => removeFavorite(fav.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

export function FavoritesHeading() {
  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
      Favorite meals
    </span>
  );
}
