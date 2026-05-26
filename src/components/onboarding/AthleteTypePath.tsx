export function AthleteTypePath({ path }: { path: string | null }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">Path: </span>
      <span className="font-medium">{path ?? "not selected"}</span>
    </div>
  );
}
