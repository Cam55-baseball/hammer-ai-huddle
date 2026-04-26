/**
 * Owner Authority — single source of truth for the system-level rule:
 *
 *   Hammer suggests. The owner decides.
 *
 * The AI may surface ideas, score quality, and explain its reasoning, but it
 * MUST NEVER:
 *   - auto-apply or upsert tags into `video_tag_assignments` without an
 *     explicit owner click,
 *   - overwrite owner-set `video_format`, `skill_domains`, or `ai_description`,
 *   - silently downgrade or remove an owner pick.
 *
 * Any new code that touches owner data must respect this rule. If a future
 * change conflicts with it, the change is wrong — fix the change.
 */
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const OWNER_AUTHORITY_LABEL = "Hammer Suggestion — Owner Decides";

interface NoteProps {
  className?: string;
  /** Compact strips the icon. */
  compact?: boolean;
}

/**
 * Subtle inline reminder that AI output is advisory only.
 * Drop wherever AI suggestions are presented to the owner.
 */
export function OwnerAuthorityNote({ className, compact }: NoteProps) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground",
        className,
      )}
      aria-label="Owner authority reminder"
    >
      {!compact && <ShieldCheck className="h-3 w-3 text-primary/70" />}
      <span>{OWNER_AUTHORITY_LABEL}</span>
    </p>
  );
}
