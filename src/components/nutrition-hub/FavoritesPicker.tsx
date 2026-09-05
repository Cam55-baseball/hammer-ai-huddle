import { Star, Trash2, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedFavorites, type UnifiedFavorite } from '@/hooks/useUnifiedFavorites';

interface Props {
  /** Called with the chosen favorite so the surface can prefill and log it. */
  onPick: (favorite: UnifiedFavorite) => void;
  emptyText?: string;
  allowDelete?: boolean;
}

/**
 * The single Favorites list. Every favourites button in the app renders this,
 * so an athlete only ever sees one starred list, whether the entry started life
 * as a saved meal or a starred food.
 */
export function FavoritesPicker({ onPick, emptyText, allowDelete = true }: Props) {
  const { favorites, loading, markPicked, remove } = useUnifiedFavorites();

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
          'No favorites yet. Tick “Save as favorite” when you log something and it will show up here.'}
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {favorites.map((fav) => (
        <div key={fav.key} className="relative flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-auto py-2 px-3 flex-col items-start min-w-[120px] max-w-[180px]
                       hover:bg-amber-500/10 hover:border-amber-500/50"
            onClick={() => {
              markPicked(fav);
              onPick(fav);
            }}
          >
            <span className="text-xs font-medium truncate w-full text-left">{fav.name}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {fav.calories ?? 0} cal · {Math.round(Number(fav.protein_g ?? 0))}g protein
              {!!fav.hydration_oz && (
                <>
                  <Droplets className="h-2.5 w-2.5 text-blue-500" />
                  {Math.round(Number(fav.hydration_oz))}oz
                </>
              )}
            </span>
          </Button>
          {allowDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${fav.name} from favorites`}
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border text-destructive"
              onClick={() => remove(fav)}
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
      Favorites
    </span>
  );
}
