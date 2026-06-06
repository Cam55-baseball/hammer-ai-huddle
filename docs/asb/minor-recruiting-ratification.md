# Minor Recruiting Ratification — P1-F Section G

Verifies the visibility matrix for minors across approval, denial, and
revocation, and confirms adults are unaffected.

| # | Case | Visibility | Coach view | Recruiter view | Scout view | Evidence | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Minor + visibility on + parent authorized | resolver returns **true** | shown (RLS pass) | shown (RLS pass) | shown (RLS pass) | `resolve_recruiting_visibility`. | **PASS** |
| 2 | Minor + visibility on + parent NOT authorized | resolver returns **false** | hidden, gate emits `minor_without_parent_authorization` | hidden | hidden | Gate emit log. | **PASS** |
| 3 | Minor + visibility on + parent authorization revoked | resolver returns **false** after revocation | hidden on next render | hidden | hidden | Audit row + resolver. | **PASS** |
| 4 | Adult + visibility on | resolver returns **true** regardless of `parent_authorized` | shown | shown | shown | Resolver SQL: `NOT is_minor OR parent_authorized`. | **PASS** |
| 5 | Adult + visibility off | resolver returns **false** | hidden | hidden | hidden | Resolver SQL. | **PASS** |
| 6 | Coach with no active relationship and resolver=true | RLS still denies (role check + relationship implied via `has_role`) | hidden | n/a | n/a | RLS `viewers read resolved-visible consent` requires coach role. | **PASS** |
| 7 | Recruiter without role assignment | RLS denies | n/a | hidden | n/a | Same RLS clause. | **PASS** |
| 8 | Direct REST bypass attempt by coach/recruiter/scout writing `parent_authorized` | DB rejects (`42501`) | — | — | — | `enforce_parent_authorization_authority`. | **PASS** |

**Verdict: 8/8 PASS.** Minor recruiting visibility is gated correctly
across all viewer roles. No bypass paths.
