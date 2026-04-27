## Problem

On mobile (≤640px), the Identity Command Card header crams three columns side-by-side:
1. Identity label + tier badge + streak chips (flame, shield, NN miss)
2. Large consistency score + "Consistency" label
3. Chevron toggle

This forces the tier label (e.g. "LOCKED IN") to clip, the streak chips to wrap onto multiple lines under a too-narrow column, and the explainer copy in expanded sections to feel cramped. The whole card becomes hard to parse at a glance.

## Fix

Restructure the header into a **mobile-first stacked layout**, then promote to the current side-by-side only on `sm:` and up. Same component, no behavior change — just layout responsiveness.

### New mobile header structure

```text
┌────────────────────────────────────────────────┐
│ IDENTITY  [REST day]                  [▼]      │  ← row 1: meta + chevron
│ LOCKED IN                              92      │  ← row 2: big label + score
│ ✓ Confirmed                       Consistency  │
│ ────────────────────────────────────────────── │
│ [🔥 5d perf] [🛡 12d active] [⚠ 2 miss/7d]    │  ← row 3: chips full-width
└────────────────────────────────────────────────┘
```

- Row 1: small "IDENTITY" eyebrow + day-type chip on the left, chevron pinned right.
- Row 2: tier label (`text-2xl`, allowed to wrap if needed) on left, consistency score + caption on right — both larger and breathing.
- Row 3: streak chips on their own line, full width, no wrap-collision with the score column.
- On `sm:` breakpoint and up, collapse rows 1+2+3 back into the existing two-column layout.

### Body section adjustments (mobile)

- Day Intent buttons: keep `grid-cols-3` but reduce icon+label to allow `text-[11px]` on narrow widths so "STANDARD"/"PUSH" don't truncate.
- Active Alerts row: stack the action button + dismiss under the message text on `< sm` (`flex-col sm:flex-row`) so long alert copy ("2 non-negotiables still open today: …") stays readable instead of being squeezed.
- Quick Actions "Next up" row: stack the label and the two CTA buttons vertically on `< sm` so the truncated `next.label` gets full width.
- Increase outer padding on mobile from `px-4` to `px-3` and the section spacing already at `space-y-4` is fine.

### Files

- **Modify**: `src/components/identity/IdentityCommandCard.tsx` — header JSX (lines ~256–327), Day Intent grid (~376), Active Alerts row (~431), Quick Actions row (~480).

No other files, no data/logic changes, no new components. Pure responsive CSS restructure.
