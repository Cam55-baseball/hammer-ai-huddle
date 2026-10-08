import { Navigate } from "react-router-dom";

/**
 * The five retired programs (Heat Factory, Iron Bambino, The Unicorn, Speed Lab,
 * Explosive Conditioning) were retired by the owner on 2026-10-08. Their pages
 * live in src/archive/retired-programs/pages/ (not routed). An old address
 * quietly goes to the dashboard — no banner, no program mention.
 * To bring a program back, see docs/owner/retired-programs.md.
 */
export function RetiredProgramRoute() {
  return <Navigate to="/dashboard" replace />;
}
