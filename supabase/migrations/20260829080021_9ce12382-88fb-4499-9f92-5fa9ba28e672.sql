INSERT INTO public.scale_reference (sport, metric, floor_value, avg_value, record_value, effective_date, direction, notes)
SELECT 'baseball', 'exchange_time_sec', 0.85, 0.70, 0.50, CURRENT_DATE, 'lower_better',
  'Catcher glove-to-release transfer time. Elite anchor grounded in documented pop-time breakdowns: J.T. Realmuto''s 1.80s pop time included a 0.54s transfer; other current elite catchers track 0.54-0.56s. 0.50 set as the 80-grade record anchor.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.scale_reference WHERE metric = 'exchange_time_sec' AND sport = 'baseball'
);