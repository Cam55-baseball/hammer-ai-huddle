import { RuntimeCard } from "@/components/runtime/RuntimeCard";

export function CoachEducationView() {
  return (
    <RuntimeCard title="Reading the lineage trail" eyebrow="Coach education">
      <p className="text-sm text-muted-foreground">
        Every recommendation cites the events that justify it. Open the lineage
        drilldown on any card to trace why — never a black box.
      </p>
    </RuntimeCard>
  );
}
