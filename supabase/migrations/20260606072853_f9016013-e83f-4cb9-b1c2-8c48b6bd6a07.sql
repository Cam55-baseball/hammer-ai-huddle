-- Project relational.relationship.confirmed / revoked events into parent_athlete_links.
-- Replay-safe, idempotent, never throws. Trigger is the canonical activation
-- path: the ledger remains the source of truth, the table is a projection.

CREATE OR REPLACE FUNCTION public.project_relationship_to_parent_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_user_id uuid;
  v_athlete_user_id uuid;
  v_relationship text;
BEGIN
  -- Only act on relationship confirm/revoke events.
  IF NEW.topic_id NOT IN (
    'relational.relationship.confirmed',
    'relational.relationship.revoked'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_parent_user_id := NEW.actor_id;
    v_athlete_user_id := NEW.athlete_id;
    v_relationship := COALESCE(NULLIF(NEW.payload->>'relationship', ''), 'parent');

    IF v_parent_user_id IS NULL OR v_athlete_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.topic_id = 'relational.relationship.confirmed' THEN
      INSERT INTO public.parent_athlete_links (
        parent_user_id,
        athlete_user_id,
        relationship,
        status,
        invited_at,
        accepted_at
      ) VALUES (
        v_parent_user_id,
        v_athlete_user_id,
        v_relationship,
        'active',
        NEW.occurred_at,
        NEW.occurred_at
      )
      ON CONFLICT (parent_user_id, athlete_user_id) DO UPDATE
        SET status = 'active',
            accepted_at = COALESCE(public.parent_athlete_links.accepted_at, EXCLUDED.accepted_at),
            revoked_at = NULL,
            updated_at = now()
        WHERE public.parent_athlete_links.status <> 'active'
           OR public.parent_athlete_links.revoked_at IS NOT NULL;

    ELSIF NEW.topic_id = 'relational.relationship.revoked' THEN
      UPDATE public.parent_athlete_links
        SET status = 'revoked',
            revoked_at = COALESCE(public.parent_athlete_links.revoked_at, NEW.occurred_at),
            updated_at = now()
        WHERE parent_user_id = v_parent_user_id
          AND athlete_user_id = v_athlete_user_id
          AND status <> 'revoked';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Linkage projection failure must never block ledger append.
    RAISE WARNING '[rr10] project_relationship_to_parent_link failed: % %',
      SQLSTATE, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_relationship_to_parent_link ON public.asb_events;
CREATE TRIGGER trg_project_relationship_to_parent_link
  AFTER INSERT ON public.asb_events
  FOR EACH ROW
  EXECUTE FUNCTION public.project_relationship_to_parent_link();

-- Backfill: replay existing confirmed events first (oldest first so accepted_at
-- is the earliest confirm), then revoked events overlay.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT athlete_id, actor_id, occurred_at,
           COALESCE(NULLIF(payload->>'relationship',''),'parent') AS relationship
    FROM public.asb_events
    WHERE topic_id = 'relational.relationship.confirmed'
      AND actor_id IS NOT NULL
    ORDER BY occurred_at ASC
  LOOP
    INSERT INTO public.parent_athlete_links (
      parent_user_id, athlete_user_id, relationship, status, invited_at, accepted_at
    ) VALUES (
      r.actor_id, r.athlete_id, r.relationship, 'active', r.occurred_at, r.occurred_at
    )
    ON CONFLICT (parent_user_id, athlete_user_id) DO UPDATE
      SET status = 'active',
          accepted_at = COALESCE(public.parent_athlete_links.accepted_at, EXCLUDED.accepted_at),
          revoked_at = NULL,
          updated_at = now()
      WHERE public.parent_athlete_links.status <> 'active'
         OR public.parent_athlete_links.revoked_at IS NOT NULL;
  END LOOP;

  FOR r IN
    SELECT athlete_id, actor_id, occurred_at
    FROM public.asb_events
    WHERE topic_id = 'relational.relationship.revoked'
      AND actor_id IS NOT NULL
    ORDER BY occurred_at ASC
  LOOP
    UPDATE public.parent_athlete_links
      SET status = 'revoked',
          revoked_at = COALESCE(public.parent_athlete_links.revoked_at, r.occurred_at),
          updated_at = now()
      WHERE parent_user_id = r.actor_id
        AND athlete_user_id = r.athlete_id
        AND status <> 'revoked';
  END LOOP;
END $$;