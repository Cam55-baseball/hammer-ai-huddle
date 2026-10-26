ALTER TABLE public.vault_scout_grades ADD COLUMN IF NOT EXISTS sport text CHECK (sport IN ('baseball','softball'));
ALTER TABLE public.throwing_reps ADD COLUMN IF NOT EXISTS sport text CHECK (sport IN ('baseball','softball'));
ALTER TABLE public.catching_reps ADD COLUMN IF NOT EXISTS sport text CHECK (sport IN ('baseball','softball'));
DO $migration$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.mastery_identity_evidence(text,date,uuid)'::regprocedure);
 IF position('''id'',g.id,''date'',g.graded_at' in definition)=0 OR position('WHERE g.user_id=athlete AND g.evaluator_id' in definition)=0 OR position('''id'',r.id,''date'',r.created_at' in definition)=0 OR position('WHERE r.user_id=athlete AND r.created_at::date<p_date' in definition)=0 THEN RAISE EXCEPTION 'Identity evidence definition changed; review before applying'; END IF;
 definition:=replace(definition,'''id'',g.id,''date'',g.graded_at','''id'',g.id,''sport'',g.sport,''date'',g.graded_at');
 definition:=replace(definition,'WHERE g.user_id=athlete AND g.evaluator_id','WHERE g.user_id=athlete AND g.sport=p_sport AND g.evaluator_id');
 definition:=replace(definition,'''id'',r.id,''date'',r.created_at','''id'',r.id,''sport'',r.sport,''date'',r.created_at');
 definition:=replace(definition,'WHERE r.user_id=athlete AND r.created_at::date<p_date','WHERE r.user_id=athlete AND r.sport=p_sport AND r.created_at::date<p_date');
 EXECUTE definition;
END $migration$;
COMMENT ON FUNCTION public.mastery_identity_evidence(text,date,uuid) IS 'Canonical training and health gates unchanged. Human/throw/catch identity requires explicit record sport; legacy measurements remain stored and unattributed, never backfilled from account sport.';