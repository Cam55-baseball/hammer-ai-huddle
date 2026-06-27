# Contextual Recording Hint for Tempo (deterministic)

Add a small, presentation-only hint panel under the existing **Tempo (deterministic)** tile in the pitching analysis. It explains how to record a clip so the deterministic pipeline can detect `peak_leg_lift` (the anchor whose absence currently shows `peak_leg_lift_missing` and suppresses the value).

This is a frontend-only, additive change. No measurement logic, schema, edge function, or trust-lock behavior changes. The tile still shows the canonical missingness reason verbatim; the new panel sits next to it as recording guidance.

## Behavior

- **Where**: directly under the existing tile in `src/pages/AnalyzeVideo.tsx` (around lines 1158–1177), inside the same `module === 'pitching'` gate, so it never appears for hitting or other modules.
- **When shown**:
  - Auto-expanded when `persistedTempo.value == null` AND `missing_reason` is one of: `peak_leg_lift_missing`, `no_signal`, `low_pose_confidence` (anchor-related).
  - Collapsed-by-default (a small "Recording tips for accurate Tempo" disclosure) when a value *was* measured, so it stays available without cluttering a successful result.
- **No telemetry, no measurement coupling.** Pure static guidance keyed off the existing `missing_reason` string already in state.

## Panel contents

Title: **How to record for reliable Tempo**

Short intro line: "Tempo needs to see your peak leg lift and front-foot strike. A few small framing choices make this consistent."

Five concise tips (icon + label + one line each):

1. **Side-on camera** — Film from the open side (3B side for RHP, 1B side for LHP), perpendicular to the rubber-to-plate line.
2. **Full body in frame** — Head to spikes visible the entire delivery; leave ~1 ft of headroom and foot-room.
3. **Start before the leg lift** — Begin recording at the set position; don't trim the front of the clip.
4. **End after release** — Keep filming through ball release and into follow-through.
5. **Good lighting, low motion blur** — Daylight or bright cage lighting; phone in 1080p/60fps if available; lock exposure on the pitcher.

Footer line (muted, smaller): "If `peak_leg_lift_missing` keeps appearing with these conditions met, the lead leg may be occluded by the glove-side arm — try a slightly higher camera (chest height) and step back 2–3 ft."

## Visual / technical details

- Reuse existing tokens: `border-border`, `bg-background`, `text-muted-foreground`, `rounded-lg`. No new colors.
- Use `lucide-react` icons already in the project (e.g. `Camera`, `User`, `Play`, `Square`, `Sun`) — one per tip, `h-4 w-4 text-muted-foreground`.
- Use shadcn `Collapsible` (already in `@/components/ui/collapsible`) for the collapsed-by-default variant when a value exists.
- No new files. ~40 lines added to `AnalyzeVideo.tsx` adjacent to the existing tile block.

## Out of scope

- No changes to `tempoPipeline`, `tempoTileAdapter`, evidence emission, or missingness vocabulary.
- No copy changes to the existing "Could not be measured from this clip (…)" line — trust-lock wording is preserved verbatim.
- No i18n keys added in this pass (matches the surrounding tile, which is also hardcoded English).
