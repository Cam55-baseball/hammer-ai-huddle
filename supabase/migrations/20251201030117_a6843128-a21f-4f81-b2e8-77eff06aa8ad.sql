-- Update Production Studio Speed Workouts with Elite Bat Speed Training Program
-- This updates all 22 templates (11 baseball + 11 softball)

-- Day 2: Overload/Underload Foundation
UPDATE workout_templates wt
SET 
  title = 'Overload/Underload Foundation',
  description = 'Establish neural contrast patterns through heavy and light bat training to maximize speed adaptation',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Heavy Bat Swings (Overload)', 'sets', 4, 'reps', '5', 'notes', '120% game weight, controlled mechanics'),
    jsonb_build_object('name', 'Game Weight Recovery Swings', 'sets', 2, 'reps', '5', 'notes', 'Reset neural pattern'),
    jsonb_build_object('name', 'Light Bat Swings (Underload)', 'sets', 5, 'reps', '6', 'notes', '80% game weight, MAX INTENT'),
    jsonb_build_object('name', 'Contrast Sequence', 'sets', 3, 'reps', '3-3-3', 'notes', 'Heavy → Game → Light, no rest between')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 2;

-- Day 4: Rotational Medicine Ball Power
UPDATE workout_templates wt
SET 
  title = 'Rotational Medicine Ball Power',
  description = 'Build hip-to-hand transfer power through explosive rotational movements',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Rotational Scoop Toss', 'sets', 4, 'reps', '6 each side', 'notes', 'Hip drive initiates, release at front hip'),
    jsonb_build_object('name', 'Standing Side Throw', 'sets', 4, 'reps', '5 each side', 'notes', 'Wall or partner, max velocity'),
    jsonb_build_object('name', 'Kneeling Rotational Throw', 'sets', 3, 'reps', '6 each side', 'notes', 'Isolate trunk rotation'),
    jsonb_build_object('name', 'Overhead Slam to Rotation', 'sets', 3, 'reps', '8', 'notes', 'Slam → immediate rotational throw')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 4;

-- Day 6: Connection & Barrel Control
UPDATE workout_templates wt
SET 
  title = 'Connection & Barrel Control',
  description = 'Maintain connection through acceleration zone with deliberate barrel path work',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Towel Behind Back Swings', 'sets', 4, 'reps', '8', 'notes', 'Towel under both armpits, don''t drop'),
    jsonb_build_object('name', 'Inside-Out Tee Work', 'sets', 4, 'reps', '6', 'notes', 'Outside pitch, hands inside ball'),
    jsonb_build_object('name', 'Stay-Through-the-Ball Drill', 'sets', 4, 'reps', '6', 'notes', 'Freeze at extension, check barrel path'),
    jsonb_build_object('name', 'Connection Contrast', 'sets', 3, 'reps', '5-5', 'notes', 'Slow motion → Max intent')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 6;

-- Day 8: Max Intent Neural Patterning
UPDATE workout_templates wt
SET 
  title = 'Max Intent Neural Patterning',
  description = 'Train the nervous system to fire maximally with game-speed intent',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Max Intent Dry Swings', 'sets', 5, 'reps', '5', 'notes', 'Game weight, 100% effort, full recovery'),
    jsonb_build_object('name', 'Tee Work - Middle-Middle Max', 'sets', 4, 'reps', '5', 'notes', 'Maximum exit velocity intent'),
    jsonb_build_object('name', 'Band-Assisted Swings', 'sets', 4, 'reps', '6', 'notes', 'Band pulls bat through, overspeed'),
    jsonb_build_object('name', 'Visualization + Swing', 'sets', 3, 'reps', '3', 'notes', 'Eyes closed visualize, open and swing')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 8;

-- Day 10: Hand Speed & Quickness
UPDATE workout_templates wt
SET 
  title = 'Hand Speed & Quickness',
  description = 'Develop fast-twitch hand speed through isolated hand drills',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'One-Hand Top Hand Swings', 'sets', 4, 'reps', '8', 'notes', 'Focus on pulling through zone'),
    jsonb_build_object('name', 'One-Hand Bottom Hand Swings', 'sets', 4, 'reps', '8', 'notes', 'Focus on guiding bat path'),
    jsonb_build_object('name', 'Rapid Fire Tee (5 sec)', 'sets', 4, 'reps', 'Max', 'notes', 'As many quality swings in 5 seconds'),
    jsonb_build_object('name', 'Short-to-Ball Drill', 'sets', 4, 'reps', '6', 'notes', 'Hands stay inside, compact path')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 10;

-- Day 12: Rotational Speed Complex
UPDATE workout_templates wt
SET 
  title = 'Rotational Speed Complex',
  description = 'Chain rotational movements at speed with resistance challenges',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Cable Anti-Rotation Hold → Rotation', 'sets', 4, 'reps', '6 each side', 'notes', '3-sec hold, then explosive rotation'),
    jsonb_build_object('name', 'Band-Resisted Swings', 'sets', 4, 'reps', '5', 'notes', 'Partner holds band at hip, fight through'),
    jsonb_build_object('name', 'Med Ball Swing Release', 'sets', 4, 'reps', '5 each side', 'notes', 'Hold ball, swing motion, release at contact'),
    jsonb_build_object('name', 'Rotational Jump + Swing', 'sets', 3, 'reps', '5', 'notes', '90° rotation jump, land and swing')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 12;

-- Day 14: Load & Timing Sequencing
UPDATE workout_templates wt
SET 
  title = 'Load & Timing Sequencing',
  description = 'Perfect the kinetic chain timing through deliberate loading patterns',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Load Hold Swings', 'sets', 4, 'reps', '6', 'notes', 'Hold back hip 2 sec, then fire'),
    jsonb_build_object('name', 'Stride Rhythm Drill', 'sets', 4, 'reps', '6', 'notes', 'Exaggerated slow stride, explosive rotation'),
    jsonb_build_object('name', 'Hip Lead Swings', 'sets', 4, 'reps', '5', 'notes', 'Hips start, shoulders chase'),
    jsonb_build_object('name', 'Tempo Contrast', 'sets', 3, 'reps', '4', 'notes', 'Slow-slow-FAST sequence')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 14;

-- Day 16: Competition Simulation
UPDATE workout_templates wt
SET 
  title = 'Competition Simulation',
  description = 'Apply bat speed under competitive stress and pressure situations',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Timed Swing Rounds', 'sets', 5, 'reps', '6', 'notes', '10 sec between swings, maintain quality'),
    jsonb_build_object('name', 'Front Toss Max Intent', 'sets', 4, 'reps', '6', 'notes', 'Flipped balls, max effort contact'),
    jsonb_build_object('name', 'Personal Record Attempts', 'sets', 3, 'reps', '3', 'notes', 'Track bat speed, beat previous'),
    jsonb_build_object('name', 'Pressure Swing Challenge', 'sets', 2, 'reps', '5', 'notes', '"Must hit this rep" mindset')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 16;

-- Day 18: Advanced Contrast Protocol
UPDATE workout_templates wt
SET 
  title = 'Advanced Contrast Protocol',
  description = 'Post-activation potentiation mastery through advanced contrast sequences',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Donut Weighted Swings', 'sets', 3, 'reps', '5', 'notes', '8oz donut on bat, full swings'),
    jsonb_build_object('name', 'Immediate Underload Swings', 'sets', 3, 'reps', '5', 'notes', 'Remove donut, swing light bat'),
    jsonb_build_object('name', 'PAP Sequence', 'sets', 4, 'reps', '2-2-2-2', 'notes', 'Heavy → Game → Light → Max Intent Game'),
    jsonb_build_object('name', 'Med Ball Slam → Swing', 'sets', 3, 'reps', '3-3', 'notes', 'Slam, immediate max swing')
  ),
  estimated_duration_minutes = 25
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 18;

-- Day 20: Full Zone Domination
UPDATE workout_templates wt
SET 
  title = 'Full Zone Domination',
  description = 'Apply bat speed to all pitch locations with maximum intent',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'High Tee Max Intent', 'sets', 3, 'reps', '5', 'notes', 'Letters-height, max effort'),
    jsonb_build_object('name', 'Low Tee Max Intent', 'sets', 3, 'reps', '5', 'notes', 'Knees-height, stay through'),
    jsonb_build_object('name', 'Inside Tee Max Intent', 'sets', 3, 'reps', '5', 'notes', 'Pull-side power'),
    jsonb_build_object('name', 'Outside Tee Max Intent', 'sets', 3, 'reps', '5', 'notes', 'Opposite field line drives'),
    jsonb_build_object('name', 'Random Zone Rounds', 'sets', 4, 'reps', '8', 'notes', 'Partner moves tee, react and crush')
  ),
  estimated_duration_minutes = 30
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 20;

-- Day 22: Peak Assessment & Competition
UPDATE workout_templates wt
SET 
  title = 'Peak Assessment & Competition',
  description = 'Measure progress and compete against self with comprehensive testing',
  exercises = jsonb_build_array(
    jsonb_build_object('name', 'Bat Speed Baseline Test', 'sets', 3, 'reps', '5', 'notes', 'Record best of each set'),
    jsonb_build_object('name', 'Exit Velocity Testing', 'sets', 3, 'reps', '5', 'notes', 'Tee work, measure every ball'),
    jsonb_build_object('name', 'Overload/Underload Final Test', 'sets', 2, 'reps', '3-3-3', 'notes', 'Heavy-Game-Light, measure all'),
    jsonb_build_object('name', 'Max Rep Challenge', 'sets', 1, 'reps', 'Max', 'notes', 'How many 90%+ swings in 2 minutes'),
    jsonb_build_object('name', 'Progress Documentation', 'sets', 1, 'reps', '1', 'notes', 'Log all numbers, compare to Day 2')
  ),
  estimated_duration_minutes = 35
FROM workout_programs wp
WHERE wt.program_id = wp.id 
  AND wp.parent_module = 'Production Studio' 
  AND wp.sub_module = 'hitting' 
  AND wt.workout_type = 'Speed' 
  AND wt.day_in_cycle = 22;