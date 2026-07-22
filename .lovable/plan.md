Goal: Replace every user-visible mention of "AI" with Hammer-branded language so users never see the word AI anywhere in the app (web, meta tags, copy, translations, errors).

Current state confirmed:
- The screenshot button in `src/components/hammer/SeasonScheduleImporterDialog.tsx` reads **"Analyze with Hammer AI"`.
- `index.html` meta description and og:description both contain "AI-powered".
- Multiple hardcoded UI strings in components still say "AI" (document import, AB swing placeholder, Hammer brief label, HelpDesk FAQ, error messages).
- English i18n still has "AI Motion Capture", "Hammer AI-Powered Results", onboarding/marketing descriptions, Mind Fuel disclaimer, and "AI credits" payment messages.
- Non-English locales (es, fr, ja, ko, nl, zh, de) still contain "AI"/"IA" user-facing strings.

Plan:

1. Hardcoded UI strings
   - `src/components/hammer/SeasonScheduleImporterDialog.tsx`
     - Button: "Analyze with Hammer AI" → "Analyze with Hammer"
     - Error: "Hammer AI didn't respond in time" → "Hammer didn't respond in time"
     - Error: "Hammer AI request failed" → "Hammer request failed"
   - `src/components/games/GameDocumentIngest.tsx`
     - Heading: "AI document import" → "Hammer document import"
   - `src/components/games/AbSwingPanel.tsx`
     - Placeholder: "helps the AI tune the read" → "helps Hammer tune the read"
   - `src/components/coach/PieV2HammerBriefPanel.tsx`
     - Label: "AI Hammer brief" → "Hammer brief"
   - `src/pages/HelpDesk.tsx`
     - FAQ fallback: "The AI will analyze your mechanics" → "Hammer will analyze your mechanics"
   - Any other non-comment string literal surfaced by the audit that is visible to users.

2. Index / SEO meta tags
   - `index.html`
     - `<meta name="description">` and `og:description`: replace "AI-powered motion capture" with "Hammer motion capture" or equivalent Hammer-branded phrasing.

3. i18n translations
   - `src/i18n/locales/en.json`
     - `heroSubtitle`: "Hammer AI-Powered Results" → "Hammer-Powered Results"
     - `aiMotionCapture`: "AI Motion Capture" → "Hammer Motion Capture"
     - Onboarding/marketing descriptions that say "AI-powered" / "AI analyzes" → "Hammer-powered" / "Hammer analyzes"
     - `mindFuel.text`: "AI-generated" → "Hammer-generated" or "system-generated"
     - Custom activity tracker `number`: "the AI analyzes" → "Hammer analyzes"
     - `paymentRequired`: "AI credits needed" → "Hammer credits needed" or "Credits needed"
   - `src/i18n/locales/es.json`, `fr.json`, `ja.json`, `ko.json`, `nl.json`, `zh.json`, `de.json`
     - Apply the same conceptual replacements in each language (e.g., Spanish "IA" → "Hammer", Japanese "AI" → "Hammer", etc.).

4. Code-only / non-user-facing cleanup
   - Leave internal variable names, edge function names, file names, and developer comments unchanged unless they are surfaced to the user (e.g., in toast/error text). The plan will only change strings that render in the UI.

5. Verification
   - After edits, run an automated scan for any remaining `\bAI\b` inside user-facing strings (JSX text nodes, translation values, meta tags, error/toast messages).
   - Build the app to confirm no TypeScript or i18n interpolation errors.
   - Visually inspect the schedule importer button, HelpDesk FAQ, and landing-page hero subtitle to confirm the word AI is gone.

Expected outcome: every user-visible instance of "AI" is replaced with Hammer-branded language, starting with the circled "Analyze with Hammer" button.