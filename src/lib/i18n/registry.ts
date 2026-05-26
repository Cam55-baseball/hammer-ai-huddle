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
    "trust.lineage": "Lineage",
    "trust.replay": "Replay",
    "trust.survivability": "Survivability",
    "trust.ceiling": "Ceiling",
    "comm.dropped": "Quiet hours — message saved to ledger.",
    "edu.confidence": "What confidence means",
    "edu.readiness": "How readiness is built",
    "edu.replay": "Why replay matters",
    "edu.continuity": "Longitudinal continuity",
    "onboarding.primer": "Survivability comes first",
    "onboarding.orientation": "How this works",
    "share.title": "Share & export",
    "share.scope": "Visibility",
  },
  es: {
    "rx.headline.recovery": "Recuperación hoy",
    "rx.headline.hybrid": "Híbrido — mantén el ritmo",
    "trust.confidence": "Confianza",
    "trust.missingness": "Cobertura de señal",
    "trust.lineage": "Linaje",
    "trust.replay": "Reproducción",
    "trust.survivability": "Supervivencia",
    "trust.ceiling": "Límite",
    "comm.dropped": "Horas tranquilas — mensaje guardado en el registro.",
    "edu.confidence": "Qué significa la confianza",
    "edu.readiness": "Cómo se construye la preparación",
    "edu.replay": "Por qué importa la reproducción",
    "edu.continuity": "Continuidad longitudinal",
    "onboarding.primer": "La supervivencia es primero",
    "onboarding.orientation": "Cómo funciona",
    "share.title": "Compartir y exportar",
    "share.scope": "Visibilidad",
  },
  ja: {
    "rx.headline.recovery": "今日は回復",
    "rx.headline.hybrid": "ハイブリッド — 継続性を保つ",
    "trust.confidence": "信頼度",
    "trust.missingness": "信号カバレッジ",
    "trust.lineage": "系譜",
    "trust.replay": "再生",
    "trust.survivability": "存続性",
    "trust.ceiling": "上限",
    "comm.dropped": "静かな時間帯 — メッセージは記録されました。",
    "edu.confidence": "信頼度の意味",
    "edu.readiness": "準備状態の組み立て方",
    "edu.replay": "再生が重要な理由",
    "edu.continuity": "長期的継続性",
    "onboarding.primer": "存続性が最優先",
    "onboarding.orientation": "仕組み",
    "share.title": "共有とエクスポート",
    "share.scope": "可視性",
  },

};

export function t(locale: Locale, key: string): string {
  return BUNDLES[locale]?.[key] ?? BUNDLES.en[key] ?? key;
}
