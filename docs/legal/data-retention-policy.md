# Data Retention & Deletion Policy — DRAFT for attorney review

| Data | Kept for | Then |
|---|---|---|
| Account profile (name, email, birthdate, sport, position) | While the account is open | Deleted within 30 days of account deletion |
| Training logs, plans, readiness, sleep, pain, injury, nutrition, body measurements | While open | Deleted within 30 days of account deletion |
| Training videos and body-movement measurements | While open; user can delete any video anytime | Deleted within 30 days of account deletion |
| Anonymous training data (opted in; no name/email) | Up to 5 years | Deleted or re-reviewed |
| Help-chat / AI conversation history | 12 months | Deleted |
| Problem reports | 24 months | Deleted |
| Parent consent (Parent Promise, Notice, signature) | While the child's account is open + 3 years | Deleted |
| consent_records (all legal agreements, opt-ins, cancellations) | Until 3 years after the account ends | Deleted (account_ended_at + 3 years) |
| Privacy requests | 3 years after completion | Deleted |
| Payment records (Stripe/Apple) | Per Stripe/Apple and tax law (7 years for tax records) | Held by the processor |
| Email delivery logs (Resend) | Resend's default (about 30 days) | Deleted by Resend |
| Backups | Rolling, provider default (about 7 days) | Overwritten |

Deletion paths: Profile → Delete my account (immediate); email request (30 days); owner queue at /owner/legal-records shows due dates.
Legal hold: the owner can pause deletion if a lawsuit or investigation requires it. [LAWYER: confirm periods, especially 3 years for consent and 5 years for anonymous data.]
