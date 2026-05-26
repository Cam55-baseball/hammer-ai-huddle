export function formatPct(n: number | null, locale: string = "en"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(n);
}
