# Update "Exciting Updates Coming Soon!" wording on the landing page

## Goal
Replace the current "under construction" recruiting language with two distinct messages:
1. **Advanced metric measuring** — still under construction (keeps the red "coming soon" framing).
2. **Professional Scout/Collegiate recruiting connections** — now live / "in full effect" for both Softball & Baseball (positive announcement).

## Target text

**Bold line (font-semibold):**
> Advanced metric measuring are under construction!

**Regular line (text-base):**
> We're working hard to bring you powerful new analytics. Your training data is being captured now for seamless integration when these features launch!

**New third line (font-semibold, positive tone — recruiting is live):**
> Professional Scout/Collegiate recruiting connections are in full effect for both Softball & Baseball

## Files to edit

### 1. `src/pages/Index.tsx` (lines 100–107) — the landing page (primary)
This file uses **hardcoded English strings**, not i18n keys, so the visible wording lives here. Replace the two existing `<p>` tags with three:
- Keep the existing `font-semibold` `<p>` but swap its text to "Advanced metric measuring are under construction!" (drops "and enhanced Professional Scout/Collegiate recruiting connections").
- Keep the existing `text-base` `<p>` but trim it to: "We're working hard to bring you powerful new analytics. Your training data is being captured now for seamless integration when these features launch!" (drops "and direct connections to scouts and recruiters").
- Add a new third `<p className="text-base font-semibold">` with the recruiting-is-live sentence.

### 2. `src/pages/ComingSoon.tsx` (lines 24–31) — consistency
Mirrors the same hardcoded block; apply the identical three-paragraph change so the two surfaces stay in sync. Use the existing `text-sm sm:text-base` sizing for the regular line and `text-base sm:text-lg font-semibold` for the bold lines.

### 3. i18n locale files (consistency only — currently unused)
The keys `comingSoonTitle` / `comingSoonDescription` / `comingSoonDetails` are defined in all 8 locale files (`en, es, fr, de, ja, zh, nl, ko`) but are **not referenced by any component** (Index.tsx/ComingSoon.tsx use hardcoded strings). Updating them is optional polish. Decision: update the **English** `en.json` values to match (lines 448–450) so the dead keys don't carry stale text, and split the description into the new three-part form. Leave the other 7 locales as-is unless you want full translations — they're never displayed.

## Styling note
The whole card is currently red (`border-red-500 bg-red-50 text-red-900`) to signal "under construction." Since recruiting is now **live** (positive), the new third line could visually pop with an emerald/green accent (e.g. `text-emerald-700 font-semibold`) to distinguish "live" from "coming soon." This is a minor visual enhancement, not required by your wording change — I'll apply the green accent to the recruiting line only if you want it; otherwise it stays red to match the card. Default plan: keep it red/`text-red-900 font-semibold` to stay faithful to the exact wording change and avoid unsolicited restyling.

## Out of scope
- No logic changes, no DB/auth/edge-function work, no routing changes.
- No changes to the "Active Development" badge.
