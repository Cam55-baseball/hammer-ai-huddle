/** Shared filming guidance for every analysis upload. */
import { Card } from "@/components/ui/card";
const ITEMS = [
  "Film close, so you fill a good part of the picture, head to feet",
  "Keep your whole body in the shot the whole time",
  "Just you in the picture",
  "Hold the camera still, in good light",
  "Include the move itself, not just the wait before it",
];

export function PitchingFilmingGuide() {
  return (
    <Card className="mx-auto max-w-xl space-y-2 p-4">
      <h2 className="text-sm font-semibold">Filming tips</h2>
      <p className="text-sm text-muted-foreground">Every clip gets an analysis — almost any video works. For the best read:</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {ITEMS.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </Card>
  );
}
