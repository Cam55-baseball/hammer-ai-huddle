# Consent Records Procedure — DRAFT for attorney review

**Table:** `consent_records` — user, document slug + version, choice (accepted / declined / withdrawn / signed / cancelled), method (checkbox, typed_signature, updated_terms, button…), signer name and role, child (for parent signatures), details, IP, device, time.

**Rules**
- Saved by the backend (`legal-consent` function), which records IP and device itself.
- Append-only: a database trigger blocks edits and deletes. The only change allowed is setting `account_ended_at` when the account is deleted.
- Kept until 3 years after the account ends.
- Every legal document is stored versioned in `legal_documents`; a record always points to the exact version shown.
- A new version (approved = true) makes the "Updated terms" screen appear once for each user.

**What gets recorded**
| Moment | Document | Method |
|---|---|---|
| Signup / updated-terms screen | terms, privacy, consumer-health-data, medical-safety | updated_terms |
| Adults 18+ | adult-release | typed_signature + checkbox |
| Under-13 parent sign-up | minor-waiver (Florida §744.301(3)) | typed_signature + drawn signature |
| 13–17 player's parent (emailed link) | minor-waiver | typed_signature + drawn signature, relationship, 18+ confirmed |
| Health data | health-data-consent (opt-in) | checkbox / toggle |
| Partner sharing | health-data-sharing (separate yes) | toggle |
| Checkout | auto-renewal-consent | unchecked checkbox |
| Cancel button | subscription-cancellation | button |

**Viewing/exporting:** owner page /owner/legal-records (CSV export).
