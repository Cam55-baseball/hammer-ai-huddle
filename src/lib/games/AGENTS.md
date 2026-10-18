- Live game-report sources exclude deleted games and scope to the signed-in athlete; frozen snapshots stay unchanged. Why: removed games must not feed new reports.
- Pitch intent/contact annotations use dedicated nullable pitch-ledger fields, never movement measurements or parsed historical notes; hard contact is an observation, not a measured threshold. Why: structured facts must not invent measurements.
- Imports map only exact known result aliases to ledger codes; unknown outcomes stay null with raw text in notes, and speed/angle never invent contact quality. Why: imported facts must remain queryable without guessed outcomes.
- Defense and running forms require only position/event choice; optional observations use explicit unknown/yes/no values and shared payload normalization. Why: untouched controls must never record invented outcomes, hands, innings or bases.

- At-bat writers require an explicitly entered inning/result and normalize optional facts through atBatEntryPayload; empty pitch lists never overwrite a manually entered or unknown count. Why: prior innings, probable opponents and empty lists are not evidence for this at-bat.
