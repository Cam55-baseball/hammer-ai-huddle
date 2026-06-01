# Relational Visibility Matrix

**Phase 151–154.** Authority: `src/lib/runtime/projections/types.ts::prepareRows`.

Every relational event carries `payload.visibility_scope`. Projections call
`prepareRows(rows, scope, prefixes)` which filters by topic prefix first, then
by the matrix below.

## Truth table

| Reader scope ↓ / Payload scope → | `self` | `coach` | `parent` | `org` | `external` | `demo` | _unset_ |
|---|---|---|---|---|---|---|---|
| `self`     | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `coach`    | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `parent`   | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `org`      | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `external` | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| `demo`     | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

Read as: "When the reader scope is _R_ and the event's `visibility_scope`
is _P_, does the event contribute to the projection?"

## Invariants

- **Demo firewall (bidirectional)** — demo events never leak into production
  projections, and production scopes never read demo events. Enforced
  constitutionally in `prepareRows`, not by UI filters.
- **Self supremacy** — `self`-scoped payloads only reach the athlete's own
  projections; coaches/parents/orgs cannot see self-only signal.
- **Unset payload** — treated as non-self, non-demo. Producers SHOULD set
  `visibility_scope` explicitly; the unset cell exists only for legacy rows.
- **Parent and coach are first-class** — Phase 152 promoted `parent` and
  `demo` to first-class `Scope` and `VisibilityScope` values; downstream
  surfaces select via `useRelationalProjections(athleteId, scope)`.

## Test coverage

`src/lib/runtime/relational/__tests__/relational-visibility.matrix.test.ts`
exercises the entire `{6 reader scopes} × {7 payload scopes}` grid and
asserts the table above row-for-row.

## Failure mode

Any future change that lets demo events surface into non-demo scopes — or
suppresses self payloads to self readers — is a constitutional regression
and must fail the visibility matrix test.
