## Goal

Make the "Your Next Best Step" card much smaller and rename it so users recognize it as the dashboard's AI agent.

## Changes (one file: `src/components/dashboard/CommunicationAI.tsx`)

1. **Rename the header** from "Your Next Best Step" to **"Coach Hammer · Next Best Step"** so it's clear this card IS the AI agent.
2. **Remove the "Why this matters" paragraph** (lines 279–282) — drops the biggest block of text on the card.
3. **Tighten the title** — change `text-lg sm:text-xl` → `text-base sm:text-lg`, and collapse the body wrapper from `space-y-2` to `space-y-1`.
4. **Shrink padding** from `p-4 sm:p-5` → `p-3 sm:p-4`, and footer top margin `mt-4` → `mt-3`.
5. **Make the CTA button compact** — add `size="sm"` so the button matches the smaller card.
6. Keep the tier badge, Sparkles icon, instruction line, and CTA — these are the essential AI-agent affordances.

## Result

Card collapses to: small header ("AI Coach · Next Best Step") + tier badge → title → one-line instruction → small CTA. Roughly half the current vertical space.

## Out of scope

No grid/layout, Weekly Recap, What's Next, Game Plan, or other dashboard components touched. No data or routing changes.