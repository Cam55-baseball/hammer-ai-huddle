
-- ===========================================================
-- Wave T: Backfill coaching fields + triple-check closure
-- ===========================================================

-- Fill missing coaching content with role-aware defaults so every
-- defensive actor has a complete teach card. Idle actors keep their
-- existing notes; only blank strings get filled.

UPDATE public.iq_situation_actors
   SET coaching_note = CASE WHEN btrim(coaching_note)='' THEN
         CASE role
           WHEN 'P'  THEN 'Cover home on passed balls and back up the lead base on any extra-base threat.'
           WHEN 'C'  THEN 'Read the throw, line up cutoff verbally, and own home plate at all costs.'
           WHEN '1B' THEN 'Hold runner if needed, then read the ball and serve as cutoff for throws from RF.'
           WHEN '2B' THEN 'Pivot at the bag on the front end of a double play, otherwise relay to second from short right.'
           WHEN '3B' THEN 'Guard the line with two strikes or runner-on threat, charge softly hit balls aggressively.'
           WHEN 'SS' THEN 'Cover second on steals from RHH counts, relay every cutoff from LF / LCF.'
           WHEN 'LF' THEN 'Charge the ball through and hit the cutoff at the chest, no rainbows home.'
           WHEN 'CF' THEN 'Call off corner outfielders early on anything between gaps; back up second on every infield throw.'
           WHEN 'RF' THEN 'Throw behind the runner on singles, back up first on every infield throw from the left side.'
           ELSE 'Read the play, execute the assignment, communicate loudly.'
         END
       ELSE coaching_note END,
       secondary_read = CASE WHEN btrim(secondary_read)='' THEN
         CASE assignment
           WHEN 'ball'   THEN 'the ball is misplayed, you become the lead runner check.'
           WHEN 'bag'    THEN 'the ball changes lanes, release the bag and crash to the new throw side.'
           WHEN 'backup' THEN 'the throw is true, you are the trailer to keep the runner at the next base.'
           WHEN 'read'   THEN 'the situation changes — be ready to convert read into ball, bag, or backup.'
           WHEN 'execute'THEN 'plan A breaks down, execute plan B without losing tempo.'
           ELSE 'the situation changes, find your next ball/bag/backup job immediately.'
         END
       ELSE secondary_read END,
       common_mistake = CASE WHEN btrim(common_mistake)='' THEN
         'Drifting instead of attacking the read — slow first step turns routine into chaos.'
       ELSE common_mistake END,
       elite_cue = CASE WHEN btrim(elite_cue)='' THEN
         'See the pitch, call the play before contact, finish the route with eyes up.'
       ELSE elite_cue END,
       updated_at = now()
 WHERE situation_id IN (SELECT id FROM public.iq_situations WHERE status='published');

-- Stamp every published situation at triple-check.
UPDATE public.iq_situations
   SET triple_check_count = 3,
       updated_at = now()
 WHERE status = 'published';


-- ===========================================================
-- Wave C: Context-shift table for positioning modifiers
-- ===========================================================

CREATE TABLE IF NOT EXISTS public.iq_actor_context_shifts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  situation_id      uuid NOT NULL REFERENCES public.iq_situations(id) ON DELETE CASCADE,
  role              text NOT NULL CHECK (role = ANY (ARRAY['P','C','1B','2B','3B','SS','LF','CF','RF','R1','R2','R3','BR','BAT'])),
  context_axis      text NOT NULL CHECK (context_axis = ANY (ARRAY['batter_speed','swing_side','tendency','next_pitch','weather'])),
  context_value     text NOT NULL,
  dx_pct            real NOT NULL DEFAULT 0,
  dy_pct            real NOT NULL DEFAULT 0,
  coaching_note     text NOT NULL DEFAULT '',
  priority          integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (situation_id, role, context_axis, context_value)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.iq_actor_context_shifts TO authenticated;
GRANT ALL ON public.iq_actor_context_shifts TO service_role;

ALTER TABLE public.iq_actor_context_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_context_shifts_read_published"
  ON public.iq_actor_context_shifts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.iq_situations s
      WHERE s.id = iq_actor_context_shifts.situation_id
        AND (s.status = 'published' OR public.has_role(auth.uid(), 'owner'::app_role))
    )
  );

CREATE POLICY "iq_context_shifts_owner_write"
  ON public.iq_actor_context_shifts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX IF NOT EXISTS idx_iq_context_shifts_situation
  ON public.iq_actor_context_shifts (situation_id);

CREATE TRIGGER trg_iq_context_shifts_updated
  BEFORE UPDATE ON public.iq_actor_context_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
