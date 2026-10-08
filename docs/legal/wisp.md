# Written Information Security Program (WISP) — DRAFT for attorney review

Hammers Modality LLC, 15985 Preserve Marketplace #1154, Odessa, FL 33556 · hammersmodality@hammersmodality.org · Florida law.

## 1. Owner of the program
Camryn Williams (owner) is the Security Coordinator. Admins act only under the owner's direction.

## 2. What we protect
All personal data in docs/legal/data-inventory.md, especially minors' data, health-type data (sleep, pain, injuries, readiness, nutrition, body measurements), training videos and body-movement measurements, payment status, and consent records.

## 3. Safeguards actually in place
- **Hosting:** Lovable Cloud (Supabase) — encrypted in transit (TLS) and at rest.
- **Access control:** row-level security on every user table; users read only their own rows; staff roles in `user_roles`; service-role keys live only in backend functions, never in the app.
- **Recruiting gate:** athlete data shown to anyone other than the athlete passes `_shared/recruitingGate.ts`.
- **Minors:** under-13 accounts are parent-controlled (signed Parent Promise + Notice, signature, typed name).
- **Secrets:** API keys (Stripe, Resend, Google AI, OpenAI, Roboflow) stored as backend secrets; never in source.
- **Payments:** card data handled only by Stripe/Apple; we never see full card numbers.
- **Consent records:** append-only (database trigger blocks edits/deletes), kept 3 years after the account ends.
- **Account deletion:** in-app (Profile → Delete account) through the `delete-account` function.
- **Change control:** no publishing/deploying without owner instruction; migrations reviewed.

## 4. Risk assessment
Reviewed at least yearly and after any incident or new vendor. Top risks: account takeover, mis-set access rules, vendor breach, over-sharing to coaches/scouts, AI prompts containing personal data.

## 5. People
Staff accounts limited to the owner and named admins; removed the same day someone leaves. Yearly privacy/security refresher.

## 6. Vendors
See vendor-list.md. Each vendor must have a data-processing agreement or equivalent terms. [LAWYER: confirm DPAs on file.]

## 7. Incidents
Follow data-breach-response-plan.md.

## 8. Review
Yearly, by the owner. Next review: 12 months after lawyer approval.
