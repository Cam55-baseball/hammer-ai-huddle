import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * RuntimeCard — single calm card primitive used across athlete + coach runtime
 * surfaces. Read-only by construction: never owns state, never mutates ledger.
 * All visible numbers must flow in from a projection over `asb_events`.
 */
export function RuntimeCard({
  title,
  eyebrow,
  trailing,
  children,
  footer,
  tone = "default",
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "elevated";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border p-4 sm:p-5",
        tone === "elevated" ? "bg-surface-runtime-elevated" : "bg-surface-runtime",
        className,
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h3 className="truncate text-base font-semibold leading-tight text-foreground">
            {title}
          </h3>
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </header>
      {children ? <div className="text-sm text-foreground">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-border/60 pt-3">{footer}</div> : null}
    </section>
  );
}
