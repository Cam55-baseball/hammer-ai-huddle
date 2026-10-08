import { guideFor } from "@/lib/hammer/prescription/movementGuide";
import { composeGuide } from "@/lib/hammer/prescription/composeGuide";

export function activityBasics(input: { name: string; slug?: string | null; setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null }) {
  const guide = guideFor(input.slug) ?? guideFor(input.name);
  const fallback = guide ? null : composeGuide(input);
  const description = guide?.what ?? (fallback ? fallback.setup.split(/(?<=[.!?])\s/)[0] : null);
  return { guide, fallback, description };
}

export function ActivityBasics(props: { name: string; slug?: string | null; setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null }) {
  const { description } = activityBasics(props);
  return description ? <p data-basic-description className="text-sm leading-snug text-muted-foreground">{description}</p> : null;
}