import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function RuntimeOrientation() {
  return (
    <RuntimeCard title="How this works" eyebrow="Orientation">
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>You log signal. We never invent it.</li>
        <li>The system shows uncertainty honestly.</li>
        <li>You stay in control of what others see.</li>
      </ul>
    </RuntimeCard>
  );
}
