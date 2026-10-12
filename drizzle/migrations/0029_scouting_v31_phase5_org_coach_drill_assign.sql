-- Plan v3.1 Phase 5: org coaches (assigned or org admin) may assign drills to
-- their athletes, not only scout-linked coaches. is_coach_of is the same
-- server-side check used by coach messaging; it already enforces org
-- membership, assignment scope and role checks.
DROP POLICY IF EXISTS "Coaches can assign drills to linked players" ON public.drill_assignments;
CREATE POLICY "Coaches can assign drills to their players"
ON public.drill_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = coach_id
  AND (
    public.is_linked_coach(auth.uid(), player_id)
    OR public.is_coach_of(auth.uid(), player_id)
  )
);