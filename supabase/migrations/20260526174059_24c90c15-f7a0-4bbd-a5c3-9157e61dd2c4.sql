INSERT INTO public.asb_engine_versions (engine_version, schema_version, notes)
VALUES ('asb-1.0.0', 1, 'Wave 3 runtime canonical engine version')
ON CONFLICT (engine_version) DO NOTHING;