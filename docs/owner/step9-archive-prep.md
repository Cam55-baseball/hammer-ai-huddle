# Step 9 — archive prep (nothing deleted)

Programs: Heat Factory, Iron Bambino, The Unicorn, Speed Lab, Explosive Conditioning. Deletion waits for your final OK.

## Prepared
1. **Docs archive** — `docs/archive/programs/<program>/` will hold each program's content, notes and screens as written today.
2. **Database backups** — SQL ready for you to apply: `docs/pending-owner-apply/step9-program-backups.sql` (copies only; read-only snapshot tables; no drops, no deletes).
3. **Session counting** — program sessions keep counting toward rest rules (via the existing external-training days), before and after archiving.
4. **Redirects (to apply at archive time)** — each old program page sends players to the card that now holds that content (Speed Lab → Speed card, Heat Factory → Throwing card, Explosive Conditioning → Conditioning card, Iron Bambino / The Unicorn → Lift card).
5. **Text to update at archive time** — pricing, plan descriptions, help-chat answers and translations in all 8 languages (en, es, fr, de, nl, ja, ko, zh). Drafts come with the redirect change so wording and pages switch together.

## Waiting on owner
- Approve the backup SQL; then the archive folders and redirects are built; deletion only after your final OK.
