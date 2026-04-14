

# Video Versioning Hardening — Audit & Fix Plan

## Current State Assessment

### 1. RPC Atomicity
- **Current**: `replace_video_version` is a `plpgsql` function — already runs in a single transaction (Postgres guarantees this).
- **Missing**: No `SELECT ... FOR UPDATE` lock on the video row. Under concurrent calls, two processes could both read the same active version and both try to deactivate/insert, leading to race conditions.
- **Fix**: Add `FOR UPDATE` lock on `library_videos` row at the start of the function.

### 2. Single Active Version Constraint
- **Current**: No partial unique index exists. The function *logically* deactivates before inserting, but nothing prevents bugs or direct SQL from creating 2 active versions.
- **Fix**: Add `CREATE UNIQUE INDEX one_active_version ON video_versions (video_id) WHERE is_active = true;`

### 3. Security — Confirmed OK
- RPC checks `auth.uid() = owner_id` internally (SECURITY DEFINER).
- RLS on `video_versions`: SELECT (all authenticated), INSERT/UPDATE (owner only via subquery on `library_videos.owner_id`).
- RLS on `library_videos`: SELECT (all authenticated), ALL ops (owner role only).
- **No changes needed.**

### 4. Storage — Public Bucket
- `videos` bucket is **public**. This is consistent with the app design: video URLs are shared with subscribers for playback. Signed URLs would break embedded players and add latency.
- **No change needed** — public is intentional for this use case.

### 5. Tag Integrity — Confirmed OK
- `library_tags` has a **unique index on `name`** — no duplicates possible at DB level.
- Tags on `library_videos` are stored as a `text[]` array referencing tag names (free-text array, but the UI only allows selecting from `library_tags`).
- **Missing**: No case-insensitive uniqueness. Tags like "Hitting" and "hitting" could coexist.
- **Fix**: Add a trigger or normalize to lowercase on insert in `library_tags`.

### 6. Failure Guarantees — Confirmed OK by Design
- The function runs in a single transaction. If the INSERT of the new version fails, the UPDATE that deactivated the old version is rolled back automatically.
- Adding `FOR UPDATE` + the partial unique index makes this bulletproof.

---

## Changes Required

### Migration 1: Harden RPC + Add Index + Tag Normalization

```sql
-- 1. Partial unique index: enforces exactly 0 or 1 active version per video
CREATE UNIQUE INDEX IF NOT EXISTS one_active_version
  ON public.video_versions (video_id)
  WHERE is_active = true;

-- 2. Hardened RPC with row-level locking
CREATE OR REPLACE FUNCTION public.replace_video_version(
  p_video_id uuid,
  p_new_url text,
  p_video_type text DEFAULT 'upload',
  p_file_size bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_next_version integer;
  v_new_id uuid;
BEGIN
  -- Lock the video row to prevent concurrent replacements
  SELECT owner_id INTO v_owner
  FROM library_videos
  WHERE id = p_video_id
  FOR UPDATE;

  IF v_owner IS NULL OR v_owner != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM video_versions WHERE video_id = p_video_id;

  UPDATE video_versions
  SET is_active = false, replaced_at = now()
  WHERE video_id = p_video_id AND is_active = true;

  INSERT INTO video_versions (video_id, version_number, video_url, video_type, is_active, file_size_bytes)
  VALUES (p_video_id, v_next_version, p_new_url, p_video_type, true, p_file_size)
  RETURNING id INTO v_new_id;

  UPDATE library_videos
  SET video_url = p_new_url, video_type = p_video_type, updated_at = now()
  WHERE id = p_video_id;

  RETURN v_new_id;
END;
$$;

-- 3. Case-insensitive unique index on library_tags
CREATE UNIQUE INDEX IF NOT EXISTS library_tags_name_lower_key
  ON public.library_tags (lower(name));

-- 4. Normalize tag names to lowercase on insert/update
CREATE OR REPLACE FUNCTION public.normalize_tag_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.name := lower(trim(NEW.name));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_tag_name
  BEFORE INSERT OR UPDATE ON public.library_tags
  FOR EACH ROW EXECUTE FUNCTION public.normalize_tag_name();
```

### No frontend changes needed
The existing `useVideoLibraryAdmin.ts` and `VideoEditForm.tsx` already handle the flow correctly — upload first, then RPC call. The hardening is purely at the database level.

## Summary

| Audit Item | Status | Action |
|---|---|---|
| RPC atomicity + locking | Missing `FOR UPDATE` | **Fix**: Add row lock |
| Single active version | No DB constraint | **Fix**: Partial unique index |
| RLS policies | Both tables covered | None |
| Storage bucket | Public (intentional) | None |
| Tag integrity | No case normalization | **Fix**: Trigger + CI index |
| Failure guarantees | Transaction-safe | Confirmed + strengthened |

