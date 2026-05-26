/**
 * Minimal i18n registry. Canonical lineage tokens (engine version, event_id,
 * topic) are intentionally NOT translatable — they remain canonical across
 * locales to preserve replay equivalence.
 */
export type Locale = "en" | "es" | "ja";

const BUNDLES: Record<Locale, Record<string, string>> = {
  en: {
    "rx.headline.recovery": "Recover today",
    "rx.headline.hybrid": "Hybrid — keep momentum",
    "trust.confidence": "Confidence",
    "trust.missingness": "Signal coverage",
    "comm.dropped": "Quiet hours — message saved to ledger.",
  },
  es: {
    "rx.headline.recovery": "Recuperación hoy",
    "rx.headline.hybrid": "Híbrido — mantén el ritmo",
    "trust.confidence": "Confianza",
    "trust.missingness": "Cobertura de señal",
    "comm.dropped": "Horas tranquilas — mensaje guardado en el registro.",
  },
  ja: {
    "rx.headline.recovery": "今日は回復",
    "rx.headline.hybrid": "ハイブリッド — 継続性を保つ",
    "trust.confidence": "信頼度",
    "trust.missingness": "信号カバレッジ",
    "comm.dropped": "静かな時間帯 — メッセージは記録されました。",
  },
};

export function t(locale: Locale, key: string): string {
  return BUNDLES[locale]?.[key] ?? BUNDLES.en[key] ?? key;
}
