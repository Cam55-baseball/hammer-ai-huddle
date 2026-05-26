import { topicLabel } from "@/lib/asb/topicLabels";

interface Props {
  id: string;
  /** Single-line variant: "Label · topic.id" */
  inline?: boolean;
  className?: string;
}

/**
 * Renders a human-readable label for a canonical topic_id while keeping the
 * raw topic_id visible as a muted caption (replay lineage stays one
 * interaction away).
 */
export function TopicLabel({ id, inline, className }: Props) {
  const label = topicLabel(id);
  if (inline) {
    return (
      <span className={className}>
        <span className="font-medium">{label}</span>
        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{id}</span>
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="block truncate text-sm font-medium">{label}</span>
      <span className="block truncate font-mono text-[10px] text-muted-foreground">{id}</span>
    </span>
  );
}
