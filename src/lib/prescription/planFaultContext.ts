import { rankFaults, type FaultSignal } from '@/lib/wic/faultLedger/ranking';
import type { ClipEvidence } from '@/lib/wic/faultLedger/cleanClipFade';

export interface PlanFinding {
  id: string; user_id: string; sport: string | null; skill_domain: string;
  fault_key: string; root_pattern_key: string | null; created_at: string; video_id: string | null;
}
export interface PlanClip extends ClipEvidence { sport: string | null; user_id: string }

/** The ledger aggregates across sports: authorize only a fully accounted-for
 * finding identity, never a fault-text guess or a selected-sport assignment.
 * Ambiguous/re-run/truncated history remains unavailable for prescription.
 */
export function planFaultContext(signals: readonly FaultSignal[], findings: readonly PlanFinding[], clips: readonly PlanClip[],
  userId: string, sport: 'baseball' | 'softball', now = Date.now()) {
  const ownClips = clips.filter(c => c.user_id === userId && c.sport === sport);
  const scopes: Record<string, { sport: 'baseball' | 'softball'; module: string }> = {};
  const accepted = signals.filter(signal => {
    if (signal.user_id !== userId || signal.source !== 'video_analysis') return false;
    const module = signal.discipline === 'running' ? 'baserunning' : signal.discipline;
    const matches = findings.filter(f => f.user_id === userId && f.skill_domain === signal.discipline
      && f.fault_key === signal.fault_key && f.root_pattern_key === signal.root_pattern_id);
    if (!matches.length || matches.length !== signal.sample_size) return false;
    if (new Set(matches.map(f => f.video_id)).size !== matches.length) return false;
    if (matches.some(f => f.sport !== sport || !f.video_id || !ownClips.some(c => c.video_id === f.video_id && c.module === module))) return false;
    const latest = Math.max(...matches.map(f => Date.parse(f.created_at)));
    if (!Number.isFinite(latest) || latest !== Date.parse(signal.observed_at)) return false;
    scopes[signal.id] = { sport, module };
    return true;
  });
  return { rankedFaults: rankFaults(accepted, now, ownClips), signalScopes: scopes };
}