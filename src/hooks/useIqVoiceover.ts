/**
 * useIqVoiceover — synchronize spoken coach cues with the playback clock.
 *
 * Fires speechSynthesis utterances the first time an actor's chip becomes
 * visible in the current mode. Debounces per-key so scrubbing doesn't spam
 * the queue. Silently no-ops when speechSynthesis is unavailable.
 */
import { useEffect, useRef } from "react";
import type { IqActor } from "@/lib/iq/types";
import type { OverlayMode } from "@/components/iq/IqCoachOverlay";

interface Params {
  enabled: boolean;
  playing: boolean;
  progress: number;
  actors: IqActor[];
  mode: OverlayMode;
}

export function useIqVoiceover({ enabled, playing, progress, actors, mode }: Params) {
  const spokenRef = useRef<Set<string>>(new Set());
  const wasEnabled = useRef(enabled);

  // Reset spoken cache when playback restarts (progress dropped near 0)
  useEffect(() => {
    if (progress <= 0.02) spokenRef.current.clear();
  }, [progress]);

  // Cancel speech when disabled or paused
  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (!enabled || !playing) synth.cancel();
    wasEnabled.current = enabled;
  }, [enabled, playing]);

  useEffect(() => {
    if (!enabled || !playing) return;
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    const wantFoot = mode === "all" || mode === "footwork";
    const wantComm = mode === "all" || mode === "comm";

    for (const a of actors) {
      // Distribute cues across the clock by role index so they don't all fire at 0
      const idx = Math.max(0, actors.indexOf(a));
      const trigger = 0.1 + (idx % 6) * 0.12;
      if (progress < trigger) continue;

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
    }
  }, [enabled, playing, progress, actors, mode]);

  // Cancel on unmount
  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);
}

export function isVoiceoverSupported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}
