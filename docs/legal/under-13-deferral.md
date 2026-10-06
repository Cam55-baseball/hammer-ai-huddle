# Under-13 users — DEFERRED by the owner

Status: deferred by owner decision. Nothing below is built.

Not built (do not build without a new owner ruling):
- No date-of-birth age gate, no child signup path, no parental-consent table.
- Terms, privacy text and signup are unchanged.

Facts to carry forward:
- The Terms currently say users must be 13 or older.
- If the app accepts users under 13 in the US, COPPA applies.
- A lawyer must confirm the verifiable-parental-consent method before any under-13 path ships.
- Date of birth is already collected in Profile Setup for age-based features; it is not an age gate.

Data a minimization review must cover before any under-13 launch:
- Name and profile photo
- Date of birth, state, team, graduation year
- Height, weight and optional body measurements
- Injury history and health check answers
- Sleep, water, nutrition and recovery answers
- Mental-health journal and career-goal text
- Training videos, analyses and anything visible to linked coaches or scouts
- Notification permission and device details

## Status 2026-10-06: built, switched off, waiting on legal sign-off
The parent-controlled under-13 account is built behind switch `under13_parent_program` (OFF).
Open legal questions: (1) is typed name + drawn signature + card payment an acceptable verifiable-parental-consent method; (2) do Google AI and OpenAI terms confirm child data sent for analysis is never used for training; (3) Parent Notice and Promise wording; (4) data retention after a parent takes back permission; (5) the consent record's IP/device storage.
