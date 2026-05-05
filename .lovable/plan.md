## Phase X.6 — Demo Conversion Optimization

Pure persuasion upgrades to the demo loop. No gating changes, no navigation restrictions.

### 1. `src/demo/prescriptions/conversionCopy.ts` — rewrite

Extend signature: `conversionCopy(simId, severity, gap, opts?: { pct?: number; visiblePct?: number })`.

Return new shape:
```ts
{ headline, subhead, cta, lossStatement, socialProof, almostUnlockedLine }
```

- **Headlines / CTAs** (per severity, sim-agnostic for consistency):
  - critical → "You're leaving serious performance on the table" / "Fix this now"
  - moderate → "You're close — this is the missing piece" / "Unlock your next level"
  - minor → "You're near elite — refine the final edge" / "Finish the system"
- **lossStatement** (sim-specific, gap-driven):
  - hitting: `~${Math.round(gap*5)} ft per ball in play lost to this gap`
  - program: `~${gap}% of weekly elite stimulus missing`
  - vault: `Only ${visiblePct ?? 35}% of your performance history visible`
- **socialProof** (subtle, no fake stats):
  - hitting: "Athletes closing this gap typically gain +3–5 mph exit velocity in 6–8 weeks"
  - program: "Athletes following this structure see ~10–20% strength gains in 8 weeks"
  - vault: "Tracking full history dramatically improves consistency and progression"
- **almostUnlockedLine** built from `pct`: `"You're ${pct}% of the way to unlocking your full system"`. If `pct > 70` override CTA to "Finish unlocking your system".

### 2. `src/components/demo/DemoLoopShell.tsx` — restructure

- Pull `pct` from `useDemoCompletion()` (`completion_pct`). Fallback formula if undefined: `clamp(((interactions[slug]||0)*15 + Math.min(60,(dwellMs[slug]||0)/1000))/100 * 100, 0, 100)`.
- Pass `pct` + `visiblePct` (vault default 35) into `conversionCopy`.
- New layout order:
  1. Input
  2. Diagnosis
  3. **Insight** card — adds `lossStatement` row under "Where you stand" (small destructive-toned chip with TrendingDown icon).
  4. Prescribed videos (now with soft preview, see §3).
  5. **Almost-unlocked progress bar** (`Progress` component) + `almostUnlockedLine` text — placed directly above CTA.
  6. **Lock CTA card** — gated by `hasMicroInteracted` state (see §6).
  7. Below CTA: small muted `socialProof` line.
- Telemetry: `logDemoEvent('cta_viewed', { simId, severity, gap, pct, fromSlug })` and same shape on `cta_clicked`. Already fires; just add `pct`.

### 3. `src/components/demo/PrescribedVideoCard.tsx` — soft gate

- Keep thumbnail/title/purpose visible (already shown). Replace center `<Lock>` with a "Preview: first 10s unlocked" pill at bottom-left of the thumbnail.
- Click handler: set local `loading` state for 600ms (spinner overlay), fire `logDemoEvent('preview_attempted', { videoId, fromSlug })`, then navigate to `/demo/upgrade?from=${fromSlug}&video=${v.id}&reason=preview`.
- Notify parent via callback prop `onPreviewClick?` so shell can set `hasMicroInteracted=true`.

### 4. Micro-interaction gate (§6)

In `DemoLoopShell`:
- `const [unlocked, setUnlocked] = useState(false)`.
- Trigger `setUnlocked(true)` on: any `onPreviewClick` from a video card, an input-change callback (new optional `onInteract` prop the shell exposes to `input`/`diagnosis` consumers — wired through context `DemoShellInteractContext` to avoid breaking existing shells), or `IntersectionObserver` showing the prescribed strip for ≥1.5s.
- While `!unlocked`, render a softened CTA card: muted background, no Sparkles glow, copy "Tap a drill to see your unlock path". Once `unlocked`, swap in the full conversion CTA.

### 5. `src/pages/demo/DemoUpgrade.tsx` — context lock-in

Above headline insert:
- Eyebrow: `You just uncovered a ${reason} gap in your ${simLabel} performance`
- **Recap block** (compact 4-cell grid): Your result · Elite benchmark · Gap · Projected improvement. Pull values from query params (`from`, `gap`, plus new `your`, `elite`, `projected` we'll start emitting from `DemoLoopShell`'s upgrade nav). Falls back gracefully when missing.
- Demote "Keep exploring demo" → `variant="link"`, `size="sm"`, muted text, placed below CTA with extra top spacing. Primary CTA gets `size="lg"` and full width.
- Telemetry already fires `upgrade_started`; ensure payload includes `simId, severity, gap, pct` (pct passed through via new query param).

### 6. `DemoLoopShell` upgrade navigation

Update CTA `onClick` to append `&your=${benchmark.yourValue}&elite=${benchmark.eliteValue}&projected=${encodeURIComponent(benchmark.projected)}&pct=${pct}` so the upgrade page recap is populated.

### 7. Event payload completeness (§9)

Audit `logDemoEvent` calls in shell + upgrade page so all four events (`cta_viewed`, `cta_clicked`, `upgrade_started`, `upgrade_completed`) carry `{ simId, severity, gap, pct }`. `useDemoTelemetry` already persists every BroadcastChannel event into `demo_events` — no DB schema changes needed.

### Out of scope (explicitly NOT changed)
- No registry/gating edits, no route changes, no removal of features.
- No fabricated percentage social proof.
- No new tables; uses existing `demo_events` for funnel analytics.

### Files touched
- `src/demo/prescriptions/conversionCopy.ts` (rewrite return shape)
- `src/components/demo/DemoLoopShell.tsx` (insight, progress, micro-gate, social proof, richer nav)
- `src/components/demo/PrescribedVideoCard.tsx` (soft preview + onPreviewClick)
- `src/pages/demo/DemoUpgrade.tsx` (eyebrow, recap, de-emphasize secondary)
- (new) tiny `src/contexts/DemoShellInteractContext.tsx` for input/diagnosis → shell interaction signal
