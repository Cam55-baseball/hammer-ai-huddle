Plan: Reduce HPI-card noise and relocate lifestyle intake to check-in flows + Coach Hammer card.

## Problem
`HumanPerformanceCard` currently shows two noise-heavy elements on the main Hammers Today surface:
- A "What drives this score?" driver dropdown that most users can ignore.
- A "Personalize this signal" / "Add lifestyle intake" block that duplicates the same sleep/hydration/stress questions already asked in daily check-ins and onboarding.

## Goal
Clean the HPI card so it only reads as a concise signal summary (score, band, narrative, breath primer, daily wisdom). Keep the lifestyle intake reachable without adding another standalone tab.

## Proposed changes

### 1. Remove the two noisy elements from `HumanPerformanceCard`
- Delete the "What drives this score?" `Collapsible` and its driver rows.
- Delete the "Personalize this signal" / "Add lifestyle intake" CTA block.
- Keep the `LifestyleIntakeSheet` import only if an external trigger still needs it; otherwise remove it from this card.
- HPI card becomes: header (score + band), narrative, breath primer, today's wisdom.

### 2. Melt lifestyle intake into the `QuickCheckInSheet`
- The daily check-in already captures sleep, hydration, stress, and soreness. Add one lightweight step (or fold into the existing sleep/stress/hydration steps) that lets the athlete confirm or update their HPI lifestyle baseline:
  - Sleep target vs. actual sleep (reuse slider values)
  - Water intake (oz)
  - Stress level
  - Constitutional lean (Yin / Balanced / Yang)
  - Preferred training window
- On save, write to `hpi:lifestyle:v1` via `writeHpiLifestyle` / `mergeHpiLifestyle` so the HPI card updates immediately.
- Use the same `LifestyleIntakeBlock` component to avoid re-implementing inputs.

### 3. Add a secondary CTA in the "Coach Hammer · Next Best Step" card
- In `CommunicationAI.tsx`, when lifestyle intake is missing or stale (>7 days), render a subtle "Personalize your signal" link below the primary CTA.
- Tapping it opens the existing `LifestyleIntakeSheet`.
- This keeps the HPI card clean but makes Coach Hammer surface the prompt only when it matters.

### 4. Preserve existing surfaces
- `FuelRecoveryStep` onboarding keeps its `LifestyleIntakeBlock` — unchanged.
- `LifestyleIntakeSheet` and `LifestyleIntakeBlock` remain the canonical intake surfaces.
- HPI score computation stays the same; only the entry points change.

## Files to edit
- `src/components/hpi/HumanPerformanceCard.tsx` — remove dropdown and CTA block.
- `src/components/checkin/QuickCheckInSheet.tsx` — add lifestyle intake step/merge.
- `src/components/dashboard/CommunicationAI.tsx` — add conditional "Personalize your signal" secondary CTA.
- `src/components/hpi/LifestyleIntakeBlock.tsx` — verify it exposes a save callback suitable for the check-in sheet (minor prop change if needed).

## Verification
- Type-check passes.
- HPI card renders without the removed elements.
- Quick check-in flow can update lifestyle data and the HPI card score updates on next render.
- Coach Hammer card shows the secondary CTA only when lifestyle intake is missing or stale.
- No duplicate lifestyle intake prompts remain in the main Today/Command path.

## Technical notes
- Reuse `readHpiLifestyle` and `writeHpiLifestyle` from `src/lib/hpi/lifestyleStore.ts`.
- Staleness check: compare `savedAt` to `Date.now() - 7 * 24 * 60 * 60 * 1000`.
- No database changes needed; all lifestyle data remains in localStorage.