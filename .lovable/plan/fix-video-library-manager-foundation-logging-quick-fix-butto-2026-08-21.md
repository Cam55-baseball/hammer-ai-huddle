# Fix Video Library Manager: Foundation logging + Quick Fix buttons

Two real defects confirmed in the owner Video Library.

## 1. Foundation videos can't be filled out properly

What's happening today:

- The foundation chip form (domain, scope, audience, refresher triggers, coach notes) exists **only** in the full Edit form and the upload wizard. With **Fast Mode on** (the default toggle in the header), editing a foundation video opens the compact editor, which shows only the per-rep fields (format, skill domain, tags) — none of the foundation fields. So there is no way to finish a foundation video in Fast Mode.
- The readiness check that drives the "incomplete" badge, the Library Health strip, and the incomplete filter ignores video class entirely: it requires format + skill domain + description + 2 taxonomy tags for every video. Foundation videos intentionally skip taxonomy tags, so a fully filled-out foundation video is permanently reported as incomplete. (The tier/confidence scoring is already class-aware — only the readiness check is not.)

Fixes:

- Make the compact Fast Mode editor class-aware: when the video is a foundation video, show the foundation chip editor + description + coach notes, and save through the same path the full editor already uses (`video_class`, `foundation_meta`). Per-rep taxonomy fields are hidden for foundation videos.
- Add a Foundation / Application class toggle inside the editor so a mis-classed video can be corrected without re-uploading.
- Make readiness class-aware end to end: foundation videos are ready when domain, scope, at least one audience level, at least one refresher trigger, and a description are present. Missing-field labels change accordingly ("Pick a domain", "Pick refresher triggers", …).
- Foundation chips get the same "what you'd gain" hints and a visible required/complete state so the form can be finished in one pass.

## 2. Smart Defaults / Complete Missing / Auto-Suggest + Review buttons don't do anything visible

Confirmed causes:

- **Smart Defaults** just opens the editor. Defaults are only applied at first mount of the editor and only when a field is empty, with no confirmation — so on most videos the click looks like a no-op.
- **Complete Missing** passes a field key that only triggers a `scrollIntoView` on the wrapper; nothing is focused or highlighted, so in a short dialog nothing appears to change.
- **Auto-Suggest + Review** silently does nothing when the description is under 20 characters — which is exactly the case for the incomplete videos the button appears on. When it does run, results land in a separate "Hammer Suggestions" tab with no way back.

Fixes:

- **Smart Defaults**: apply the owner's most-used format/domain to the empty fields immediately on open, show a toast naming what was pre-filled, and mark those fields with a "suggested — review" style so it's obvious what changed and still requires a save.
- **Complete Missing**: step through missing fields one at a time — scroll to it, actually focus the control, ring-highlight it, and show a "1 of 3 remaining" counter with a Next control that advances as fields get filled.
- **Auto-Suggest + Review**: when the description is too short, generate a draft description first (via the existing Hammer description composer) instead of failing silently; disable the button with an explanatory tooltip when it truly can't run; surface returned suggestions inline in the editor with Accept / Reject per suggestion so review happens without leaving the dialog. Show clear pending/empty/error states.
- Foundation videos get their own quick-fix set (missing chips), not the per-rep set.

## Technical notes

- `src/lib/videoReadiness.ts` — add `videoClass` + `foundationMeta` to the draft shape; branch missing-field computation by class.
- Migration to replace the `library_videos_readiness` view with a class-aware version (foundation branch mirrors `recompute_library_video_tier`'s foundation scoring inputs). View only; no table changes, no grants needed beyond what exists.
- `src/components/owner/VideoFastEditor.tsx` — render `FoundationTagEditor` for foundation class; refs + `focus()` for the missing-field walker; inline suggestion accept/reject list.
- `src/components/owner/QuickFixActions.tsx` — class-aware intents, disabled states with reasons.
- `src/components/owner/VideoLibraryManager.tsx` — pass class into quick-fix routing; keep the confirm-on-close guard working for the foundation readiness rule.
- Reuse `regenerateAISuggestions` and the existing suggestions table; no new edge function.
