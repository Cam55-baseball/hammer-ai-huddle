/**
 * useIqVoiceover — synchronize spoken coach cues with the playback clock.
 *
 * Fires speechSynthesis utterances at each actor's real timeline `startAt`
 * (per Phase 4 §4.2) rather than a fixed index heuristic. Debounces per-key
 * so scrubbing doesn't spam the queue, cancels on pause/scrub/disable, and
 * silently no-ops when speechSynthesis is unavailable.
 */
import { useEffect, useRef } from "react";
import type { IqActor, IqActorRole } from "@/lib/iq/types";
import type { OverlayMode } from "@/components/iq/IqCoachOverlay";

interface Params {
  enabled: boolean;
  playing: boolean;
  progress: number;
  actors: IqActor[];
  mode: OverlayMode;
  /** Per-actor start time on the 0..1 clock. Defaults to a lightly staggered fallback. */
  startAts?: Partial<Record<IqActorRole, number>>;
}

const DEFAULT_STAGGER = (idx: number, n: number) => 0.15 + (idx / Math.max(1, n)) * 0.05;

export function useIqVoiceover({
  enabled, playing, progress, actors, mode, startAts,
}: Params) {
  const spokenRef = useRef<Set<string>>(new Set());

  // Reset spoken cache when playback restarts (progress dropped near 0)
  useEffect(() => {
    if (progress <= 0.02) spokenRef.current.clear();
  }, [progress]);

  // Cancel speech when disabled or paused (or scrub — parent pauses on scrub)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (!enabled || !playing) synth.cancel();
  }, [enabled, playing]);

  useEffect(() => {
    if (!enabled || !playing) return;
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    const wantFoot = mode === "all" || mode === "footwork";
    const wantComm = mode === "all" || mode === "comm";
    if (!wantFoot && !wantComm) return;

    const n = actors.length;
    actors.forEach((a, idx) => {
      const startAt = startAts?.[a.role] ?? DEFAULT_STAGGER(idx, n);
      // Small offset so the utterance lands just as the chip becomes visible.
      const trigger = Math.min(0.98, startAt + 0.02);
      if (progress < trigger) return;

      if (wantFoot) {
        const foot = (a as unknown as { footwork_cue?: string | null }).footwork_cue;
        if (foot) {
          const key = `${a.role}:foot:${foot}`;
          if (!spokenRef.current.has(key)) {
            spokenRef.current.add(key);
            try {
              const u = new SpeechSynthesisUtterance(`${a.role}: ${foot}`);
              u.rate = 1.05; u.pitch = 1; u.volume = 0.9;
              synth.speak(u);
            } catch { /* noop */ }
          }
        }
      }
      if (wantComm) {
        const call = a.communication_call?.trim();
        if (call) {
          const key = `${a.role}:call:${call}`;
          if (!spokenRef.current.has(key)) {
            spokenRef.current.add(key);
            try {
              const u = new SpeechSynthesisUtterance(call);
              u.rate = 1.15; u.pitch = 1.1; u.volume = 1;
              synth.speak(u);
            } catch { /* noop */ }
          }
        }
      }
    });
  }, [enabled, playing, progress, actors, mode, startAts]);

  // Cancel on unmount
  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);
}

export function isVoiceoverSupported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}
