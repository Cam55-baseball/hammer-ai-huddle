import { guideFor } from "@/lib/hammer/prescription/movementGuide";
import { composeGuide } from "@/lib/hammer/prescription/composeGuide";
import { BASIC_HOW_TO } from "@/lib/hammer/prescription/basicHowTo.generated";

/** Plain "how to do one rep" first: hand-written guide, then the library's own basic how-to. */
export function activityBasics(input: { name: string; slug?: string | null; setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null }) {
  const guide = guideFor(input.slug) ?? guideFor(input.name);
  const fallback = guide ? null : composeGuide(input);
  const basic = (input.slug && BASIC_HOW_TO[input.slug]) || null;
  const description = guide?.what ?? basic ?? (fallback ? fallback.setup.split(/(?<=[.!?])\s/)[0] : null);
  return { guide, fallback, description };
}

export function ActivityBasics(props: { name: string; slug?: string | null; setup?: string | null; cue?: string | null; stopIf?: string | null; dosage?: string | null; repair?: (t: string) => string }) {
  const { description } = activityBasics(props);
  const text = description && props.repair ? props.repair(description) : description;
  return text ? <div data-basic-description className="text-sm leading-snug text-foreground"><p className="mb-1 font-semibold">How to do one rep</p><p>{text}</p></div> : null;
}
