CREATE TABLE public.arm_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  source text NOT NULL CHECK (source IN ('position','pitching')),
  throw_type text NOT NULL CHECK (throw_type IN ('catch_play','position_throws','infield_quick_release','infield_short_hops','outfield_crow_hop','long_toss','catcher_throwdowns','pitcher_warmup','pitcher_catch_play')),
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0 AND count <= 1000),
  prescribed integer CHECK (prescribed IS NULL OR prescribed >= 0),
  status text NOT NULL DEFAULT 'done' CHECK (status IN ('done','skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date, throw_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arm_ledger_entries TO authenticated;
GRANT ALL ON public.arm_ledger_entries TO service_role;
ALTER TABLE public.arm_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Athletes manage own arm ledger" ON public.arm_ledger_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Linked coaches read athlete arm ledger" ON public.arm_ledger_entries FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id));
CREATE INDEX idx_arm_ledger_user_date ON public.arm_ledger_entries (user_id, entry_date DESC);
CREATE TRIGGER arm_ledger_entries_set_updated_at BEFORE UPDATE ON public.arm_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();