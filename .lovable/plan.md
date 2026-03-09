

# Fix 5 Bugs: Logout Issues, Sport Switching, Pickoff Landing Pages, Video Notes + Translation

## Issues Identified

### 1. Softball Stealing logs user out
**Root cause**: `SoftballStealingTrainer.tsx` line 26-29 — the sport guard runs `navigate('/dashboard')` on initial render before `useAuth` has resolved the session. Since `useAuth` starts with `user: null` and `loading: true`, the auth guard on line 33-35 fires `navigate('/auth')` immediately, logging the user out effectively.

**Fix**: Add `loading` from `useAuth()`, skip guards while loading.

### 2. Practice Intelligence doesn't recognize baseball/softball switch
**Root cause**: `PracticeHub.tsx` uses `useSportTheme()` for the sport context but the module list (`modules` array on line 31) is static — it never changes based on sport. The sport-specific terminology uses `useSportTerminology()` but the actual module tabs and session types don't react to the sport toggle. The `activeModule` state persists across sport switches since there's no reset when sport changes.

**Fix**: Add a `useEffect` that resets `activeModule` to the first available module when `sportKey` changes. The modules themselves are sport-agnostic (hitting, pitching, etc. exist for both), so the main issue is likely that the practice session save uses the wrong sport. Check and ensure `sportKey` is passed to `createSession` instead of a hardcoded value.

### 3. Pickoff Trainer not on Complete Pitcher or Golden 2Way landing pages
**Root cause**: `CompletePitcher.tsx` has a static `tiles` array with only 3 items (pitching analysis, heat factory, explosive conditioning) — no pickoff trainer entry. `GoldenTwoWay.tsx` similarly lacks it.

**Fix**: Add a pickoff trainer tile to both landing pages (baseball only, like base stealing).

### 4. Clicking Pickoff Trainer logs user out
**Root cause**: `PickoffTrainer.tsx` line 24 — `if (!user) return <Navigate to="/auth" replace />;` fires before `useAuth` finishes loading. The `loading` state isn't checked.

**Fix**: Add `loading` from `useAuth()`, show a loading state while auth resolves.

### 5. Video Library notes by owner + translation to user's language
**Root cause**: The `library_videos` table has only `description` — no separate `notes` field for owner teaching notes. Also, no translation mechanism exists for video content.

**Fix**:
- Add a `notes` column to `library_videos` via migration
- Add notes input to `VideoUploadForm.tsx`
- Display notes on `VideoLibraryPlayer.tsx`
- Use an edge function with Lovable AI (Gemini Flash) to translate title, description, and notes to the user's selected language on-the-fly, with client-side caching

## Files to Edit

| File | Changes |
|------|---------|
| `src/pages/SoftballStealingTrainer.tsx` | Add `loading` guard from `useAuth`, skip guards while loading |
| `src/pages/PickoffTrainer.tsx` | Add `loading` guard from `useAuth`, show spinner while loading |
| `src/pages/CompletePitcher.tsx` | Add pickoff trainer tile (baseball only) |
| `src/pages/GoldenTwoWay.tsx` | Add pickoff trainer tile (baseball only) |
| `src/pages/PracticeHub.tsx` | Ensure sport reactivity — reset state on sport change, pass correct sport to session save |
| `src/pages/VideoLibraryPlayer.tsx` | Display notes, add translation logic for title/description/notes |
| `src/components/owner/VideoUploadForm.tsx` | Add notes textarea field |
| `src/hooks/useVideoLibraryAdmin.ts` | Include notes in upload/edit operations |

## New Files

| File | Purpose |
|------|---------|
| `supabase/functions/translate-video-content/index.ts` | Edge function using Lovable AI (Gemini Flash) to translate video title, description, and notes to a target language |

## Database Migration

```sql
ALTER TABLE public.library_videos ADD COLUMN notes text;
```

## Translation Approach

- Edge function accepts `{ videoId, targetLang }` and returns translated `{ title, description, notes }`
- Uses Gemini 2.5 Flash Lite (fast, cheap) via Lovable AI
- Client caches translations in memory per video+language pair
- `VideoLibraryPlayer` detects user's `i18next` language and auto-translates if not English
- Owner always enters content in English; translations are generated on demand

