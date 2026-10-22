/** The website and token issuer must accept the same purchase landing paths. */
export function purchaseHandoffLanding(rawNext: unknown): string {
  return typeof rawNext === "string" && /^\/(checkout|pricing|select-modules|staff-plans)(\?[^\s#]*)?$/.test(rawNext)
    ? rawNext
    : "/checkout";
}