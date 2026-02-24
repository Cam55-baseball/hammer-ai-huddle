interface MLBSeasonCounterProps {
  mlbSeasons: number;
  auslSeasons: number;
}

export function MLBSeasonCounter({ mlbSeasons, auslSeasons }: MLBSeasonCounterProps) {
  return (
    <div className="flex gap-4 text-sm">
      {mlbSeasons > 0 && (
        <span className="text-muted-foreground">
          MLB: <span className="font-semibold text-foreground">{mlbSeasons}</span>
        </span>
      )}
      {auslSeasons > 0 && (
        <span className="text-muted-foreground">
          AUSL: <span className="font-semibold text-foreground">{auslSeasons}</span>
        </span>
      )}
      {mlbSeasons === 0 && auslSeasons === 0 && (
        <span className="text-muted-foreground">No pro seasons</span>
      )}
    </div>
  );
}
