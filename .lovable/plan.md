

# Cross-Session Linking System (Pitcher ↔ Hitter Sync)

This is a two-part feature: (1) expand pitcher hitter-outcome fields in existing rep logging, and (2) build a real-time session linking system using one-time codes.

## Part 1: Expand Pitcher Hitter-Outcome Fields

Currently, pitcher sessions only show `showLiveAbHitterFields` for `live_bp` rep source, with limited fields (swing result, ball result, at-bat outcome). The prompt requires importing the full hitting micro-layer fields into pitcher sessions when facing hitters.

### Changes to `contextAppropriatenessEngine.ts`

Add a new visibility flag `showPitcherHitterOutcomes` that activates when the pitcher module uses any hitter-facing rep source: `live_bp`, `flat_ground_vs_hitter`, `bullpen_vs_hitter`, `game`.

### Changes to `RepScorer.tsx`

After the existing Live AB Hitter Tracking section, add a new "Hitter Outcome Details" section gated by `showPitcherHitterOutcomes`. Fields:
- **Swing Decision** (correct / incorrect)
- **Contact Quality** (miss / foul / weak / hard / barrel)
- **Exit Direction** (pull / middle / oppo / slap_side)
- **Batted Ball Type** (ground / line / fly / barrel / one_hopper)
- **Spin Direction** (topspin / backspin / knuckle / backspin_tail)
- **Adjustment Tag** (stayed_back / got_on_top / shortened / extended / none)

These reuse existing `ScoredRep` fields (`swing_decision`, `contact_quality`, `exit_direction`, `batted_ball_type`, `spin_direction`, `adjustment_tag`) — already on the interface. No new fields needed on `ScoredRep`.

Also add `bullpen_vs_hitter` as a new pitching rep source in `RepSourceSelector.tsx` under the Mound group, and add it to `VALID_PITCHING_SOURCES` for all session types. Add `sim_game` source as well for "Simulated Game."

### Changes to `RepSourceSelector.tsx`

- Add `{ value: 'bullpen_vs_hitter', label: 'Bullpen vs Hitter', desc: 'Bullpen with live hitter' }` to PITCHING_SOURCES Mound group
- Add `{ value: 'sim_game', label: 'Simulated Game', desc: 'Simulated game reps' }` to PITCHING_SOURCES Live group
- Add both to all `VALID_PITCHING_SOURCES` entries

---

## Part 2: Cross-Session Linking System

### Database Changes (Migration)

Create a new `live_ab_links` table:

```sql
CREATE TABLE public.live_ab_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_code TEXT NOT NULL UNIQUE,
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_session_id UUID REFERENCES public.performance_sessions(id),
  joiner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joiner_session_id UUID REFERENCES public.performance_sessions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'completed')),
  sport TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.live_ab_links ENABLE ROW LEVEL SECURITY;

-- Users can see links they created or joined
CREATE POLICY "Users see own links" ON public.live_ab_links
  FOR SELECT TO authenticated
  USING (creator_user_id = auth.uid() OR joiner_user_id = auth.uid());

-- Users can create links
CREATE POLICY "Users create links" ON public.live_ab_links
  FOR INSERT TO authenticated
  WITH CHECK (creator_user_id = auth.uid());

-- Users can update links they're part of
CREATE POLICY "Users update own links" ON public.live_ab_links
  FOR UPDATE TO authenticated
  USING (creator_user_id = auth.uid() OR joiner_user_id = auth.uid());
```

Add `linked_session_id` column to `performance_sessions`:

```sql
ALTER TABLE public.performance_sessions 
  ADD COLUMN linked_session_id UUID REFERENCES public.performance_sessions(id),
  ADD COLUMN link_code TEXT;
```

### New Components

**`src/components/practice/LiveAbLinkPanel.tsx`**
- Shows during Live AB / Live BP session setup
- Two buttons: "Generate Link Code" and "Join Session"
- Generate: creates a 6-char alphanumeric code (AB-XXXXX format), inserts into `live_ab_links`
- Join: input field for code, validates & links
- Shows link status (waiting / connected)
- Code expires after 2 hours, max 1 active code per user

**`src/components/practice/LinkedSessionBanner.tsx`**
- Small banner shown in RepScorer when a session is linked
- Shows partner's name and link status
- "Unlink" button to disconnect

### Integration Points

**`SessionConfigPanel.tsx`**
- When session type is `live_abs` or rep source is `live_bp`/`flat_ground_vs_hitter`/`bullpen_vs_hitter`/`sim_game`/`game`, show the `LiveAbLinkPanel`
- Pass `linkCode` and `linkedSessionId` through to session save

**`usePerformanceSession.ts`**
- Save `linked_session_id` and `link_code` when creating session
- When linked, both sessions reference each other

### Data Sharing Architecture

When sessions are linked, rep data is NOT duplicated. Instead:
- Each player logs their own perspective (pitcher logs pitch data, hitter logs swing data)
- The `linked_session_id` foreign key connects them
- Analytics queries can JOIN on this to build the full picture
- Future dashboards query: `WHERE id = X OR linked_session_id = X` to get both perspectives

### Code Abuse Prevention

- Codes expire after 2 hours
- Max 1 active code per user at a time
- Code format: `AB-` + 5 random alphanumeric chars
- Once joined, code status changes to 'active' (can't be reused)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `contextAppropriatenessEngine.ts` | Add `showPitcherHitterOutcomes` flag |
| `RepScorer.tsx` | Add hitter outcome fields for pitcher sessions, add to `ScoredRep` if needed |
| `RepSourceSelector.tsx` | Add `bullpen_vs_hitter` and `sim_game` sources |
| `LiveAbLinkPanel.tsx` | **New** — code generation and join UI |
| `LinkedSessionBanner.tsx` | **New** — linked status display |
| `SessionConfigPanel.tsx` | Show link panel for applicable sessions |
| `usePerformanceSession.ts` | Save link fields |
| Migration | Create `live_ab_links` table, add columns to `performance_sessions` |

## What This Does NOT Do

- Does not duplicate rep data between sessions
- Does not require real-time sync of individual reps (each player logs independently)
- Does not break existing session data (all new fields nullable)
- Does not add sport-specific logic (works for both baseball and softball)

