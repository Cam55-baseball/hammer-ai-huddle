INSERT INTO public.video_tag_taxonomy (layer, key, label, skill_domain, description, sport, position_scope, active)
SELECT v.layer::video_tag_layer_enum, v.key, v.label, 'fielding'::skill_domain_enum, v.description, 'softball', v.scope, true
FROM (VALUES
  ('result','sb_short_diamond_throw_rushed','Throw rushed on the short diamond','Sixty-foot bases remove a beat; the release breaks down rather than the fielding.', ARRAY['middle_infield','third_base','catcher']),
  ('movement_pattern','sb_corner_crash_too_early','Corner crashes too early on the slap','Corner commits before reading slap or swing and is beaten both ways.', ARRAY['first_base','third_base']),
  ('movement_pattern','sb_fb_late_off_bag_slap_and_run','Late off the bag on the slap-and-run','First baseman holds the bag too long against the slap-and-run.', ARRAY['first_base']),
  ('result','sb_riseball_popup_tracking_late','Late tracking the riseball pop-up','Backspin carries the ball differently; first read on the pop-up is late or wrong.', NULL::text[]),
  ('movement_pattern','sb_of_depth_short_porch','Outfield depth wrong for the short porch','Depth played for a baseball fence on a shorter softball outfield.', ARRAY['corner_outfield','center_field']),
  ('result','sb_c_block_riseball_out_of_crouch','Riseball blocked out of the crouch','Blocking a ball climbing out of the zone is not the same block as a ball down.', ARRAY['catcher']),
  ('correction','sb_p_follow_through_to_fifth_infielder','Finish the windmill into fielding position','Follow through off the windmill so the pitcher lands ready as a fifth infielder.', ARRAY['pitcher'])
) AS v(layer, key, label, description, scope)
WHERE NOT EXISTS (
  SELECT 1 FROM public.video_tag_taxonomy t WHERE t.key = v.key
);