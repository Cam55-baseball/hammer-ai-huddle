insert into video_tag_taxonomy (layer, key, label, skill_domain, description, sport, position_scope, active)
select v.layer::video_tag_layer_enum, v.key, v.label, 'fielding'::skill_domain_enum, v.description, v.sport, v.position_scope, true
from (values
('result','pop_time_slow','Slow pop time','Ball leaves late from the crouch to second.','both',array['catcher']),
('movement_pattern','c_transfer_stalls','Transfer stalls','Ball sits in the glove before the exchange.','both',array['catcher']),
('movement_pattern','bare_hand_late','Late to the bare hand','Waits on the slow roller instead of picking it clean.','both',array['middle_infield','third_base','pitcher']),
('correction','barehand_pickup','Bare-hand pickup on the run','Field it moving, off the throwing-side foot.','both',array['middle_infield','third_base','pitcher']),
('result','backhand_pulled_off','Pulled off the backhand','Glove turns over and the ball gets past.','both',array['middle_infield','third_base','first_base']),
('correction','work_around_the_backhand','Work around the backhand','Take an angle that lets the glove finish through the ball.','both',array['middle_infield','third_base','first_base']),
('movement_pattern','in_between_hop_frozen','Frozen on the in-between hop','Neither charges nor retreats, takes the worst hop.','both',array['first_base','middle_infield','third_base','pitcher']),
('correction','attack_or_retreat_decision','Attack it or give ground','Decide early: come get the short hop or back up to the long one.','both',array['first_base','middle_infield','third_base','pitcher']),
('result','of_lost_in_sun','Lost in the sun','Ball is lost to glare and drops or plays off the fielder.','both',array['corner_outfield','center_field']),
('result','of_lost_in_lights','Lost in the lights','Ball is lost against the lights on a night ball.','both',array['corner_outfield','center_field']),
('correction','shield_and_drift','Shield and drift','Glove up to block the light, move off the straight line to keep it visible.','both',array['corner_outfield','center_field']),
('result','relay_throw_offline','Relay throw offline','The relay leg misses the target and costs a base.','both',array['middle_infield','corner_outfield','center_field']),
('correction','line_up_the_relay','Line up the relay','Get on the line early, hands up, turn glove side.','both',array['middle_infield','corner_outfield','center_field']),
('result','missed_cutoff_man','Missed the cutoff man','Throw sails over the cut and the trail runner advances.','both',array['corner_outfield','center_field']),
('correction','throw_through_the_cutoff','Throw through the cutoff','Low, on a line, through the cut man''s chest.','both',array['corner_outfield','center_field']),
('result','rundown_gave_extra_base','Rundown gave up a base','Too many throws, runner advances or is safe.','both',null),
('correction','run_him_hard_one_throw','Run him hard, one throw','Push the runner full speed back to the previous bag, one throw to tag.','both',null),
('result','no_priority_call','No priority call','Nobody called it, ball drops or two fielders converge.','both',null),
('correction','call_it_early_and_loud','Call it early and loud','Claim the ball on the way, repeat it, everyone else peels.','both',null),
('movement_pattern','sb_pitcher_as_fifth_infielder','Pitcher not playing as a fifth infielder','Softball pitcher does not finish in a fielding position on the short diamond.','softball',array['pitcher']),
('movement_pattern','sb_short_field_reaction_late','Late reaction on the short diamond','Reaction time at 60-foot bases beats the first move.','softball',array['middle_infield','third_base','first_base']),
('movement_pattern','sb_slap_first_step_wrong_way','First step wrong way on the slap','Reads the slap late and opens away from the ball.','softball',array['middle_infield','first_base','third_base']),
('context','sb_riseball_popup_priority','Riseball pop-up priority','Rise-driven infield pop-ups change who owns the ball.','softball',null),
('movement_pattern','p_comebacker_late_hands','Late hands on the comebacker','Glove arrives after the ball on a ball hit back at the pitcher.','both',array['pitcher']),
('movement_pattern','p_late_to_cover_first','Late breaking to first','Does not leave the mound on contact to the right side.','both',array['pitcher']),
('movement_pattern','p_slow_off_mound_on_bunt','Slow off the mound on the bunt','Waits for the ball to stop instead of attacking it.','both',array['pitcher']),
('movement_pattern','p_drifts_on_backup','Drifts instead of backing up','Watches the play rather than getting deep behind the base.','both',array['pitcher']),
('movement_pattern','p_slow_to_plate_with_runner','Slow to the plate with a runner on','Delivery time lets the runner leave uncontested.','baseball',array['pitcher']),
('movement_pattern','sb_p_slow_windmill_with_runner','Slow windmill with a runner on','Windmill timing and the leaping start make the delivery clock different from baseball.','softball',array['pitcher']),
('movement_pattern','p_falls_off_glove_side','Falls off to the glove side','Finish carries the pitcher off line and out of the play.','baseball',array['pitcher']),
('movement_pattern','sb_p_drag_finish_off_line','Drag finish carries off line','Windmill drag and replant finish leaves the pitcher unbalanced and unfieldable.','softball',array['pitcher']),
('result','p_comebacker_misplayed','Comebacker misplayed','Ball back through the box is booted, dropped or thrown away.','both',array['pitcher']),
('result','p_beaten_to_the_bag','Beaten to the bag','Runner reaches first because the pitcher arrived late.','both',array['pitcher']),
('result','p_bunt_no_play','No play on the bunt','Bunt fielded too slowly to get an out anywhere.','both',array['pitcher']),
('result','p_runner_steals_on_delivery','Runner steals on the delivery','Base given up on the pitcher''s clock, not the catcher''s arm.','both',array['pitcher']),
('result','p_missed_backup','Missed the backup','Overthrow advances a runner because no one was behind the base.','both',array['pitcher']),
('correction','p_field_the_comebacker','Field the comebacker cleanly','Finish square, glove out front, secure it before the throw.','both',array['pitcher']),
('correction','p_beat_the_ball_to_the_bag','Beat the ball to the bag','Break on contact, run to the line, then up it.','both',array['pitcher']),
('correction','p_attack_the_bunt_set_the_feet','Attack the bunt and set the feet','Get to the ball early enough to gather and throw on line.','both',array['pitcher']),
('correction','p_back_up_the_throw','Back up the throw','Get deep behind the base the throw is going to, angle to the ball.','both',array['pitcher']),
('correction','p_quicken_the_delivery','Quicken the delivery','Cut the time to the plate from the stretch without losing the pitch.','baseball',array['pitcher']),
('correction','sb_p_quicken_the_windmill','Quicken the windmill','Shorten the arm circle and the drag so the delivery clock holds the runner.','softball',array['pitcher']),
('correction','p_finish_square_and_fieldable','Finish square and fieldable','Land balanced with the chest to the hitter, ready to field.','baseball',array['pitcher']),
('correction','sb_p_finish_square_off_the_drag','Finish square off the drag','Replant from the drag so the finish leaves you square and able to field.','softball',array['pitcher'])
) as v(layer,key,label,description,sport,position_scope)
where not exists (select 1 from video_tag_taxonomy t where t.key = v.key);

update video_tag_taxonomy
set position_scope = array['first_base','middle_infield','third_base']
where key = 'fd_backhand_reach_late';