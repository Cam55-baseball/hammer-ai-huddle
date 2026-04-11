export interface BaserunningLevel {
  tier: string;
  label: string;
  points: number;
  currentThreshold: number;
  nextThreshold: number | null;
  progressToNext: number;
  color: string;
  gradient: string;
}

const TIERS = [
  { tier: "rookie", label: "Rookie", threshold: 0, color: "hsl(var(--muted-foreground))", gradient: "from-muted-foreground/60 to-muted-foreground" },
  { tier: "reactive", label: "Reactive", threshold: 100, color: "hsl(210 100% 50%)", gradient: "from-blue-400 to-blue-600" },
  { tier: "instinctive", label: "Instinctive", threshold: 300, color: "hsl(270 70% 55%)", gradient: "from-purple-400 to-purple-600" },
  { tier: "elite", label: "Elite", threshold: 600, color: "hsl(45 100% 50%)", gradient: "from-amber-400 to-amber-600" },
  { tier: "top", label: "0.01%", threshold: 1000, color: "hsl(0 80% 55%)", gradient: "from-red-500 to-amber-500" },
] as const;

export function computeBaserunningLevel(
  completedLessons: number,
  accuracy: number,
  streak: number
): BaserunningLevel {
  const lessonPts = Math.min(completedLessons * 50, 500);
  const accuracyPts = Math.round((accuracy / 100) * 300);
  const streakPts = Math.min(streak, 20) * 10;
  const points = lessonPts + accuracyPts + streakPts;

  let currentIdx = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].threshold) { currentIdx = i; break; }
  }

  const current = TIERS[currentIdx];
  const next = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;
  const progressToNext = next
    ? Math.min(((points - current.threshold) / (next.threshold - current.threshold)) * 100, 100)
    : 100;

  return {
    tier: current.tier,
    label: current.label,
    points,
    currentThreshold: current.threshold,
    nextThreshold: next?.threshold ?? null,
    progressToNext: Math.round(progressToNext),
    color: current.color,
    gradient: current.gradient,
  };
}
