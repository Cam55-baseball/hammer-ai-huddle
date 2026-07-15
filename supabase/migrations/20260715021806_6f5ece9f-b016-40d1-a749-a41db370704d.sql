
CREATE TABLE public.iq_defensive_alignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL CHECK (sport IN ('baseball','softball')),
  preset_key text NOT NULL,
  label text NOT NULL,
  positions jsonb NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport, preset_key)
);

GRANT SELECT ON public.iq_defensive_alignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.iq_defensive_alignments TO authenticated;
GRANT ALL ON public.iq_defensive_alignments TO service_role;

ALTER TABLE public.iq_defensive_alignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view alignments"
  ON public.iq_defensive_alignments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert alignments"
  ON public.iq_defensive_alignments FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update alignments"
  ON public.iq_defensive_alignments FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can delete alignments"
  ON public.iq_defensive_alignments FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_iq_defensive_alignments_updated_at
  BEFORE UPDATE ON public.iq_defensive_alignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.iq_situations ADD COLUMN IF NOT EXISTS alignment_preset text;
ALTER TABLE public.iq_scenarios  ADD COLUMN IF NOT EXISTS alignment_preset text;

-- Seed presets. Coordinates use the 0-100 grid where y=100 is home plate,
-- y=0 is the CF wall. Softball infield is tighter so infielders sit closer
-- to home; outfielders play shallower.
INSERT INTO public.iq_defensive_alignments (sport, preset_key, label, positions, is_default) VALUES
('baseball','standard','Standard',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":72,"y":66},"2B":{"x":60,"y":52},"SS":{"x":40,"y":52},"3B":{"x":28,"y":66},"LF":{"x":22,"y":22},"CF":{"x":50,"y":10},"RF":{"x":78,"y":22}}'::jsonb, true),
('baseball','dp_depth','Double Play Depth',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":70,"y":64},"2B":{"x":58,"y":56},"SS":{"x":42,"y":56},"3B":{"x":28,"y":64},"LF":{"x":22,"y":22},"CF":{"x":50,"y":10},"RF":{"x":78,"y":22}}'::jsonb, false),
('baseball','no_doubles','No Doubles',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":72,"y":66},"2B":{"x":60,"y":52},"SS":{"x":40,"y":52},"3B":{"x":28,"y":66},"LF":{"x":16,"y":14},"CF":{"x":50,"y":6},"RF":{"x":84,"y":14}}'::jsonb, false),
('baseball','corners_in','Corners In',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":68,"y":72},"2B":{"x":60,"y":52},"SS":{"x":40,"y":52},"3B":{"x":32,"y":72},"LF":{"x":22,"y":22},"CF":{"x":50,"y":10},"RF":{"x":78,"y":22}}'::jsonb, false),
('baseball','bunt','Bunt Defense',
 '{"P":{"x":50,"y":74},"C":{"x":50,"y":94},"1B":{"x":62,"y":78},"2B":{"x":68,"y":62},"SS":{"x":42,"y":54},"3B":{"x":36,"y":76},"LF":{"x":22,"y":22},"CF":{"x":50,"y":10},"RF":{"x":78,"y":22}}'::jsonb, false),
('baseball','shift_l','Shift vs LHH',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":76,"y":62},"2B":{"x":70,"y":52},"SS":{"x":58,"y":52},"3B":{"x":40,"y":56},"LF":{"x":30,"y":26},"CF":{"x":62,"y":12},"RF":{"x":80,"y":22}}'::jsonb, false),
('baseball','shift_r','Shift vs RHH',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":68,"y":62},"2B":{"x":42,"y":52},"SS":{"x":30,"y":52},"3B":{"x":24,"y":62},"LF":{"x":18,"y":22},"CF":{"x":38,"y":12},"RF":{"x":70,"y":26}}'::jsonb, false),
('baseball','of_shallow','Outfield Shallow',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":72,"y":66},"2B":{"x":60,"y":52},"SS":{"x":40,"y":52},"3B":{"x":28,"y":66},"LF":{"x":26,"y":32},"CF":{"x":50,"y":22},"RF":{"x":74,"y":32}}'::jsonb, false),
('baseball','of_deep','Outfield Deep',
 '{"P":{"x":50,"y":68},"C":{"x":50,"y":94},"1B":{"x":72,"y":66},"2B":{"x":60,"y":52},"SS":{"x":40,"y":52},"3B":{"x":28,"y":66},"LF":{"x":18,"y":16},"CF":{"x":50,"y":6},"RF":{"x":82,"y":16}}'::jsonb, false),

('softball','standard','Standard',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":70,"y":62},"2B":{"x":60,"y":48},"SS":{"x":40,"y":48},"3B":{"x":30,"y":62},"LF":{"x":24,"y":26},"CF":{"x":50,"y":14},"RF":{"x":76,"y":26}}'::jsonb, true),
('softball','dp_depth','Double Play Depth',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":68,"y":60},"2B":{"x":58,"y":52},"SS":{"x":42,"y":52},"3B":{"x":30,"y":60},"LF":{"x":24,"y":26},"CF":{"x":50,"y":14},"RF":{"x":76,"y":26}}'::jsonb, false),
('softball','no_doubles','No Doubles',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":70,"y":62},"2B":{"x":60,"y":48},"SS":{"x":40,"y":48},"3B":{"x":30,"y":62},"LF":{"x":18,"y":18},"CF":{"x":50,"y":10},"RF":{"x":82,"y":18}}'::jsonb, false),
('softball','corners_in','Corners In',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":66,"y":68},"2B":{"x":60,"y":48},"SS":{"x":40,"y":48},"3B":{"x":34,"y":68},"LF":{"x":24,"y":26},"CF":{"x":50,"y":14},"RF":{"x":76,"y":26}}'::jsonb, false),
('softball','slap_defense','Slap Defense',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":62,"y":74},"2B":{"x":66,"y":58},"SS":{"x":38,"y":58},"3B":{"x":34,"y":72},"LF":{"x":22,"y":32},"CF":{"x":46,"y":18},"RF":{"x":72,"y":26}}'::jsonb, false),
('softball','shift_l','Shift vs LHH',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":74,"y":58},"2B":{"x":68,"y":48},"SS":{"x":56,"y":48},"3B":{"x":40,"y":54},"LF":{"x":32,"y":28},"CF":{"x":60,"y":16},"RF":{"x":78,"y":24}}'::jsonb, false),
('softball','shift_r','Shift vs RHH',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":66,"y":58},"2B":{"x":44,"y":48},"SS":{"x":32,"y":48},"3B":{"x":26,"y":58},"LF":{"x":20,"y":24},"CF":{"x":40,"y":16},"RF":{"x":70,"y":28}}'::jsonb, false),
('softball','of_shallow','Outfield Shallow',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":70,"y":62},"2B":{"x":60,"y":48},"SS":{"x":40,"y":48},"3B":{"x":30,"y":62},"LF":{"x":28,"y":34},"CF":{"x":50,"y":24},"RF":{"x":72,"y":34}}'::jsonb, false),
('softball','of_deep','Outfield Deep',
 '{"P":{"x":50,"y":60},"C":{"x":50,"y":94},"1B":{"x":70,"y":62},"2B":{"x":60,"y":48},"SS":{"x":40,"y":48},"3B":{"x":30,"y":62},"LF":{"x":20,"y":18},"CF":{"x":50,"y":8},"RF":{"x":80,"y":18}}'::jsonb, false);
