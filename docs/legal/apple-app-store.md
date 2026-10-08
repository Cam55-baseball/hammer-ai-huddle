# Apple — DRAFT

## 1. In-app account deletion (Guideline 5.1.1(v))
Exists: Profile → "Delete account" (`DeleteAccountSection` → `delete-account` function), also reachable from Settings → Legal & privacy → Delete my account (`/profile#delete-account`). It removes every table the account owns (256-table list generated from the live schema) and the sign-in. Consent records are kept 3 years as required records. Proven earlier with test accounts; not re-run on a real account this round (needs a test account the owner approves).

## 2. App Store privacy-label worksheet
| Apple data type | Collected | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| Name, Email | Yes | Yes | No | App functionality, account |
| Phone | No | — | — | — |
| Health (pain, injury, readiness, sleep) | Yes | Yes | No | App functionality |
| Fitness (workouts, logs) | Yes | Yes | No | App functionality |
| Body (height, weight, measurements) — Apple counts under Health & Fitness | Yes | Yes | No | App functionality |
| Photos or Videos (training videos, food photos) | Yes | Yes | No | App functionality |
| Coarse location (weather) | Yes | No | No | App functionality |
| Purchases | Yes | Yes | No | App functionality |
| User content (chat, notes, reports) | Yes | Yes | No | App functionality, support |
| Crash/diagnostics (problem reports) | Yes | Yes | No | App functionality |
| Other: date of birth (age gates) | Yes | Yes | No | App functionality |
No advertising, no tracking, no data sold.

## 3. Age range & parent approval (Texas App Store Accountability Act, from Jan 1 2026; Apple Declared Age Range API)
Steps:
1. **Xcode (owner build needed):** add Apple's `DeclaredAgeRange` framework; request ranges 13 / 16 / 18 at first launch.
2. **Native bridge (owner build needed):** a small Capacitor plugin returns `{ lowerBound, upperBound, declaration: "selfDeclared" | "guardianDeclared" }`. (ios/ and capacitor.config.ts are not touched by me — owner adds this.)
3. **Web code (can be done now, behind legal_v2):** on sign-up, if the bridge returns under 13 → force the existing parent sign-up; 13–17 → owner decision (see Waiting on owner); 18+ → normal. Save the signal in consent_records (method `apple_age_range`).
4. **Parent approval for big changes:** Apple's "Significant change" / parental consent request API for minors when terms change — owner build needed.
5. **Purchases by minors:** Ask to Buy handled by Apple.
[LAWYER: confirm Texas law status (litigation) and Utah/Louisiana equivalents.]
