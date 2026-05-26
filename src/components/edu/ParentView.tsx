import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function ParentView({ headline, note }: { headline: string; note?: string }) {
  return (
    <RuntimeCard title="What your athlete is doing" eyebrow="Family view">
      <p className="text-base">{headline}</p>
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
    </RuntimeCard>
  );
}
