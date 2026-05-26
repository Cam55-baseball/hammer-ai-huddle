/**
 * Wave 2 — Ops shell layout (calm, dense, monochrome).
 */
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = [
  { to: "/ops/health", label: "Health" },
  { to: "/ops/replay", label: "Replay" },
  { to: "/ops/drift", label: "Drift" },
  { to: "/ops/deployment", label: "Deployment" },
];

export function OpsShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-3 flex items-center gap-6">
        <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          Ops
        </span>
        <nav className="flex gap-4 text-sm">
          {NAV.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-6 py-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
