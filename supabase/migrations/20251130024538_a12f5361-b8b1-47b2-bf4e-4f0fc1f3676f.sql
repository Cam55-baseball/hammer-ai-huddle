-- Seed workout programs for all sub-modules, sports, and blocks
INSERT INTO workout_programs (parent_module, sub_module, sport, block_number, title, description, duration_weeks) VALUES
-- Production Studio (Hitting) - Baseball
('hitting', 'production_studio', 'baseball', 1, 'Block 1: Foundation Phase', 'Building fundamental strength and explosive power for hitting mechanics', 6),
('hitting', 'production_studio', 'baseball', 2, 'Block 2: Power Development', 'Increasing rotational power and bat speed through progressive overload', 6),
('hitting', 'production_studio', 'baseball', 3, 'Block 3: Speed Focus', 'Maximizing bat speed and hand speed with lighter loads', 6),
('hitting', 'production_studio', 'baseball', 4, 'Block 4: Integration Phase', 'Combining strength and speed for peak performance', 6),
('hitting', 'production_studio', 'baseball', 5, 'Block 5: Competition Prep', 'Fine-tuning mechanics and maintaining peak condition', 6),
('hitting', 'production_studio', 'baseball', 6, 'Block 6: Peak Performance', 'Maintaining elite hitting performance through season', 6),
-- Production Studio (Hitting) - Softball
('hitting', 'production_studio', 'softball', 1, 'Block 1: Foundation Phase', 'Building fundamental strength and explosive power for hitting mechanics', 6),
('hitting', 'production_studio', 'softball', 2, 'Block 2: Power Development', 'Increasing rotational power and bat speed through progressive overload', 6),
('hitting', 'production_studio', 'softball', 3, 'Block 3: Speed Focus', 'Maximizing bat speed and hand speed with lighter loads', 6),
('hitting', 'production_studio', 'softball', 4, 'Block 4: Integration Phase', 'Combining strength and speed for peak performance', 6),
('hitting', 'production_studio', 'softball', 5, 'Block 5: Competition Prep', 'Fine-tuning mechanics and maintaining peak condition', 6),
('hitting', 'production_studio', 'softball', 6, 'Block 6: Peak Performance', 'Maintaining elite hitting performance through season', 6),
-- Production Lab (Pitching) - Baseball
('pitching', 'production_lab', 'baseball', 1, 'Block 1: Arm Care Foundation', 'Establishing arm health and building foundational strength', 6),
('pitching', 'production_lab', 'baseball', 2, 'Block 2: Velocity Development', 'Increasing throwing velocity through progressive training', 6),
('pitching', 'production_lab', 'baseball', 3, 'Block 3: Command & Control', 'Refining mechanics and improving pitch command', 6),
('pitching', 'production_lab', 'baseball', 4, 'Block 4: Power Endurance', 'Building stamina for multiple innings and outings', 6),
('pitching', 'production_lab', 'baseball', 5, 'Block 5: Competition Phase', 'Maintaining velocity and health during season', 6),
('pitching', 'production_lab', 'baseball', 6, 'Block 6: Peak Performance', 'Sustaining elite pitching through full season', 6),
-- Production Lab (Pitching) - Softball
('pitching', 'production_lab', 'softball', 1, 'Block 1: Arm Care Foundation', 'Establishing arm health and building foundational strength', 6),
('pitching', 'production_lab', 'softball', 2, 'Block 2: Velocity Development', 'Increasing throwing velocity through progressive training', 6),
('pitching', 'production_lab', 'softball', 3, 'Block 3: Command & Control', 'Refining mechanics and improving pitch command', 6),
('pitching', 'production_lab', 'softball', 4, 'Block 4: Power Endurance', 'Building stamina for multiple innings and outings', 6),
('pitching', 'production_lab', 'softball', 5, 'Block 5: Competition Phase', 'Maintaining velocity and health during season', 6),
('pitching', 'production_lab', 'softball', 6, 'Block 6: Peak Performance', 'Sustaining elite pitching through full season', 6),
-- Rainbow Bread (Throwing) - Baseball
('throwing', 'rainbow_bread', 'baseball', 1, 'Block 1: Defensive Foundation', 'Building arm strength and defensive mechanics', 6),
('throwing', 'rainbow_bread', 'baseball', 2, 'Block 2: Arm Strength Phase', 'Increasing throwing velocity and distance', 6),
('throwing', 'rainbow_bread', 'baseball', 3, 'Block 3: Accuracy & Release', 'Improving throwing accuracy and quick release', 6),
('throwing', 'rainbow_bread', 'baseball', 4, 'Block 4: Game Speed Training', 'Training throws at game speed with precision', 6),
('throwing', 'rainbow_bread', 'baseball', 5, 'Block 5: Competition Ready', 'Maintaining arm health and performance in-season', 6),
('throwing', 'rainbow_bread', 'baseball', 6, 'Block 6: Elite Performance', 'Sustaining peak defensive performance', 6),
-- Rainbow Bread (Throwing) - Softball
('throwing', 'rainbow_bread', 'softball', 1, 'Block 1: Defensive Foundation', 'Building arm strength and defensive mechanics', 6),
('throwing', 'rainbow_bread', 'softball', 2, 'Block 2: Arm Strength Phase', 'Increasing throwing velocity and distance', 6),
('throwing', 'rainbow_bread', 'softball', 3, 'Block 3: Accuracy & Release', 'Improving throwing accuracy and quick release', 6),
('throwing', 'rainbow_bread', 'softball', 4, 'Block 4: Game Speed Training', 'Training throws at game speed with precision', 6),
('throwing', 'rainbow_bread', 'softball', 5, 'Block 5: Competition Ready', 'Maintaining arm health and performance in-season', 6),
('throwing', 'rainbow_bread', 'softball', 6, 'Block 6: Elite Performance', 'Sustaining peak defensive performance', 6);

-- Seed workout templates for Block 1 of Production Studio Baseball (Strength workouts)
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, estimated_duration_minutes, exercises, experience_level, equipment_needed)
SELECT 
  p.id,
  d.day_num,
  d.title,
  d.description,
  'strength',
  60,
  d.exercises::jsonb,
  'all',
  ARRAY['barbell', 'dumbbells', 'medicine ball', 'resistance bands']
FROM workout_programs p
CROSS JOIN (VALUES
  (1, 'Day 1: Foundation Strength', 'Lower body power and core stability', '[{"name": "Trap Bar Deadlift", "sets": 3, "reps": "6-8", "notes": "Focus on explosive hip drive"}, {"name": "Medicine Ball Rotational Throws", "sets": 3, "reps": 10, "notes": "Maximum intent on each throw"}, {"name": "Anti-Rotation Press", "sets": 3, "reps": "8 each side", "notes": "Resist rotation, maintain posture"}]'),
  (5, 'Day 5: Upper Body Power', 'Pushing strength and shoulder stability', '[{"name": "Incline Dumbbell Press", "sets": 4, "reps": "6-8", "notes": "Explosive concentric, controlled eccentric"}, {"name": "Cable Rotational Pulls", "sets": 3, "reps": "10 each side", "notes": "Simulate swing mechanics"}, {"name": "Face Pulls", "sets": 3, "reps": 15, "notes": "Shoulder health and posture"}]'),
  (9, 'Day 9: Lower Body Explosiveness', 'Hip power and reactive strength', '[{"name": "Box Jumps", "sets": 4, "reps": 5, "notes": "Maximum height, soft landing"}, {"name": "Bulgarian Split Squats", "sets": 3, "reps": "8 each leg", "notes": "Single leg stability and strength"}, {"name": "Pallof Press", "sets": 3, "reps": 12, "notes": "Core anti-rotation strength"}]'),
  (13, 'Day 13: Total Body Integration', 'Combining upper and lower power', '[{"name": "Power Cleans", "sets": 4, "reps": 4, "notes": "Triple extension focus"}, {"name": "Landmine Rotations", "sets": 3, "reps": "8 each side", "notes": "Explosive rotational power"}, {"name": "Farmer Walks", "sets": 3, "distance": "40 yards", "notes": "Grip strength and core stability"}]'),
  (17, 'Day 17: Strength Endurance', 'Building work capacity', '[{"name": "Front Squats", "sets": 3, "reps": 10, "notes": "Maintain upright posture"}, {"name": "Dumbbell Rows", "sets": 3, "reps": "10 each arm", "notes": "Control the eccentric"}, {"name": "Suitcase Carries", "sets": 3, "distance": "40 yards each side", "notes": "Resist lateral flexion"}]'),
  (21, 'Day 21: Power Maintenance', 'Maintaining strength gains', '[{"name": "Trap Bar Deadlift", "sets": 3, "reps": 6, "notes": "Increase load from Day 1"}, {"name": "Overhead Med Ball Slams", "sets": 3, "reps": 8, "notes": "Maximum power output"}, {"name": "Cable Chops", "sets": 3, "reps": "10 each side", "notes": "Explosive rotation"}]'),
  (25, 'Day 25: Dynamic Strength', 'Speed-strength development', '[{"name": "Jump Squats", "sets": 4, "reps": 5, "notes": "Light load, maximum velocity"}, {"name": "Single Arm Dumbbell Press", "sets": 3, "reps": "8 each arm", "notes": "Core stabilization"}, {"name": "Anti-Extension Plank", "sets": 3, "duration": "30 seconds", "notes": "Prevent lower back arch"}]'),
  (29, 'Day 29: Hybrid Power', 'Strength and speed combined', '[{"name": "Hex Bar Deadlift", "sets": 4, "reps": 5, "notes": "Heavy but explosive"}, {"name": "Rotational Medicine Ball Throws", "sets": 3, "reps": "8 each side", "notes": "Simulate bat path"}, {"name": "Lateral Band Walks", "sets": 3, "reps": "15 each direction", "notes": "Hip stability"}]'),
  (33, 'Day 33: Peak Strength', 'Testing strength improvements', '[{"name": "Deadlift", "sets": 3, "reps": 5, "notes": "Heaviest load of block"}, {"name": "Weighted Pull-ups", "sets": 3, "reps": 6, "notes": "Upper body pulling power"}, {"name": "Loaded Carries Complex", "sets": 3, "distance": "60 yards", "notes": "Farmer + Suitcase"}]'),
  (37, 'Day 37: Active Recovery Strength', 'Light load movement quality', '[{"name": "Goblet Squats", "sets": 3, "reps": 12, "notes": "Perfect form, lighter load"}, {"name": "TRX Rows", "sets": 3, "reps": 15, "notes": "Control tempo"}, {"name": "Bird Dogs", "sets": 3, "reps": "10 each side", "notes": "Core stability"}]'),
  (41, 'Day 41: Final Push', 'Consolidating gains', '[{"name": "Box Squats", "sets": 3, "reps": 8, "notes": "Explosive out of bottom"}, {"name": "Push Press", "sets": 3, "reps": 6, "notes": "Lower body drive to upper"}, {"name": "Rotational Med Ball Slams", "sets": 3, "reps": "8 each side", "notes": "Maximum intent"}]')
) d(day_num, title, description, exercises)
WHERE p.parent_module = 'hitting' 
  AND p.sub_module = 'production_studio' 
  AND p.sport = 'baseball' 
  AND p.block_number = 1;

-- Seed workout templates for Block 1 of Production Studio Baseball (Speed workouts)
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, estimated_duration_minutes, exercises, experience_level, equipment_needed)
SELECT 
  p.id,
  d.day_num,
  d.title,
  d.description,
  'speed',
  45,
  d.exercises::jsonb,
  'all',
  ARRAY['cones', 'agility ladder', 'resistance bands']
FROM workout_programs p
CROSS JOIN (VALUES
  (2, 'Day 2: Linear Speed', 'Acceleration and max velocity', '[{"name": "Sprint Intervals", "sets": 6, "distance": "40 yards", "rest": "60 seconds"}, {"name": "Resisted Sprints", "sets": 4, "distance": "20 yards", "notes": "Use resistance band"}, {"name": "Flying 10s", "sets": 4, "distance": "10 yards", "notes": "Build up then max speed"}]'),
  (4, 'Day 4: Lateral Quickness', 'Change of direction speed', '[{"name": "Lateral Shuffle Drills", "sets": 4, "duration": "20 seconds", "notes": "Stay low, quick feet"}, {"name": "5-10-5 Pro Agility", "sets": 4, "notes": "Time each rep"}, {"name": "Lateral Bound Series", "sets": 3, "reps": "8 each direction", "notes": "Explosive lateral push"}]'),
  (6, 'Day 6: Rotational Speed', 'Bat speed and turn acceleration', '[{"name": "Medicine Ball Rotational Throws", "sets": 4, "reps": "8 each side", "notes": "Maximum velocity"}, {"name": "Overspeed Bat Swings", "sets": 5, "reps": 10, "notes": "Underload bat, max intent"}, {"name": "Cable Rotations", "sets": 3, "reps": "12 each side", "notes": "Speed with control"}]'),
  (8, 'Day 8: Reactive Speed', 'Reaction time and first step quickness', '[{"name": "Reactive Cone Drills", "sets": 6, "notes": "Partner calls direction"}, {"name": "Mirror Drills", "sets": 4, "duration": "30 seconds", "notes": "React to partners movements"}, {"name": "Drop Step Sprints", "sets": 6, "distance": "20 yards", "notes": "Quick turn and accelerate"}]'),
  (10, 'Day 10: Hand Speed', 'Bat speed and hand quickness', '[{"name": "Underload Bat Swings", "sets": 5, "reps": 15, "notes": "85% of bat weight"}, {"name": "Bat Speed Drills", "sets": 4, "reps": 10, "notes": "Maximum bat velocity"}, {"name": "Quick Hands Drill", "sets": 4, "reps": 12, "notes": "Rapid fire swings"}]'),
  (12, 'Day 12: Multi-Directional Speed', 'Agility and coordination', '[{"name": "T-Drill", "sets": 4, "notes": "Time each rep for progress"}, {"name": "Zigzag Sprints", "sets": 4, "distance": "30 yards", "notes": "Sharp cuts"}, {"name": "Ladder Drills Complex", "sets": 3, "duration": "60 seconds", "notes": "Variety of footwork patterns"}]'),
  (14, 'Day 14: Explosive Starts', 'First step and acceleration', '[{"name": "Block Starts", "sets": 6, "distance": "10 yards", "notes": "Explosive first three steps"}, {"name": "Falling Starts", "sets": 4, "distance": "20 yards", "notes": "Lean and accelerate"}, {"name": "Sled Push Sprints", "sets": 4, "distance": "20 yards", "notes": "Drive through legs"}]'),
  (16, 'Day 16: Speed Endurance', 'Maintaining speed under fatigue', '[{"name": "200m Repeats", "sets": 4, "rest": "90 seconds", "notes": "Consistent pace"}, {"name": "Shuttles", "sets": 4, "reps": "10 yards x 5", "notes": "Quick turns"}, {"name": "Base Running Intervals", "sets": 6, "notes": "Home to second, timed"}]'),
  (18, 'Day 18: Rotational Power Speed', 'Maximum bat velocity', '[{"name": "Overload to Underload Swings", "sets": 5, "reps": "5 heavy + 5 light", "notes": "Contrast method"}, {"name": "Cable Rotational Pulls", "sets": 4, "reps": "10 each side", "notes": "Explosive with control"}, {"name": "Med Ball Partner Throws", "sets": 4, "reps": "8 each side", "notes": "Chest pass rotational"}]'),
  (20, 'Day 20: Comprehensive Speed', 'All speed qualities', '[{"name": "40 Yard Dash", "sets": 3, "notes": "Time for assessment"}, {"name": "Pro Agility", "sets": 3, "notes": "Time for assessment"}, {"name": "Bat Speed Test", "sets": 3, "reps": 5, "notes": "Record max velocity"}]'),
  (22, 'Day 22: Linear Acceleration', 'Building top speed', '[{"name": "10-20-30 Sprints", "sets": 4, "notes": "Progressive distance"}, {"name": "Hill Sprints", "sets": 6, "distance": "30 yards", "notes": "Drive knees, pump arms"}, {"name": "Resisted Starts", "sets": 4, "distance": "15 yards", "notes": "Partner resistance"}]'),
  (24, 'Day 24: Change of Direction', 'Sharp cuts and turns', '[{"name": "W-Drill", "sets": 4, "notes": "Quick direction changes"}, {"name": "Box Drill", "sets": 4, "notes": "4 cones square pattern"}, {"name": "Crossover Steps", "sets": 4, "distance": "20 yards each direction", "notes": "Speed with technique"}]'),
  (26, 'Day 26: Power Speed', 'Speed with strength', '[{"name": "Broad Jumps", "sets": 4, "reps": 3, "notes": "Maximum distance"}, {"name": "Bounding Series", "sets": 4, "distance": "30 yards", "notes": "Alternate leg explosiveness"}, {"name": "Speed Ladder Complex", "sets": 3, "duration": "90 seconds", "notes": "High intensity footwork"}]'),
  (28, 'Day 28: Bat Speed Focus', 'Maximum bat velocity development', '[{"name": "Underload Swings", "sets": 6, "reps": 10, "notes": "70% bat weight, max speed"}, {"name": "Rapid Fire Drill", "sets": 4, "reps": 20, "notes": "Continuous swings, maintain speed"}, {"name": "Tee Work Speed", "sets": 5, "reps": 8, "notes": "Focus on barrel speed through zone"}]'),
  (30, 'Day 30: Reactive Agility', 'Responding to external cues', '[{"name": "Tennis Ball Drops", "sets": 8, "notes": "React and catch before second bounce"}, {"name": "Partner Tag", "sets": 4, "duration": "30 seconds", "notes": "Quick changes in small space"}, {"name": "Visual Reaction Sprints", "sets": 6, "distance": "15 yards", "notes": "Sprint on visual cue"}]'),
  (32, 'Day 32: Base Running Speed', 'Game-specific speed', '[{"name": "Home to First", "sets": 6, "notes": "Timed, explosive start"}, {"name": "First to Third", "sets": 4, "notes": "Maintain speed through turns"}, {"name": "Stealing Technique", "sets": 6, "notes": "Explosive first two steps"}]'),
  (34, 'Day 34: Top Speed Development', 'Maximum velocity work', '[{"name": "Flying 20s", "sets": 4, "distance": "20 yards", "notes": "30 yard build up to max speed"}, {"name": "Overspeed Towing", "sets": 4, "distance": "20 yards", "notes": "If equipment available"}, {"name": "Downhill Sprints", "sets": 4, "distance": "30 yards", "notes": "Slight grade, controlled"}]'),
  (36, 'Day 36: Rotational Velocity', 'Peak bat speed', '[{"name": "Contrast Swings", "sets": 6, "reps": "3 heavy + 3 light", "notes": "Back to back sets"}, {"name": "Band-Resisted Swings", "sets": 4, "reps": 8, "notes": "Explosive through resistance"}, {"name": "Medicine Ball Scoop Throws", "sets": 4, "reps": "8 each side", "notes": "Underhand rotational power"}]'),
  (38, 'Day 38: Speed Maintenance', 'Active recovery speed work', '[{"name": "Easy Tempo Runs", "sets": 4, "distance": "100 yards", "notes": "70% effort"}, {"name": "Dynamic Movement Drills", "sets": 3, "duration": "3 minutes", "notes": "Various patterns"}, {"name": "Light Bat Speed Work", "sets": 3, "reps": 10, "notes": "Focus on mechanics, not max effort"}]'),
  (40, 'Day 40: Pre-Assessment Speed', 'Preparation for testing', '[{"name": "Sprint Technique Work", "sets": 4, "distance": "30 yards", "notes": "Perfect form"}, {"name": "Agility Refresher", "sets": 3, "notes": "T-drill and Pro Agility practice"}, {"name": "Bat Speed Technique", "sets": 3, "reps": 8, "notes": "Quality swings"}]'),
  (42, 'Day 42: Final Assessment', 'Testing all speed qualities', '[{"name": "40 Yard Dash Test", "sets": 2, "notes": "Record best time"}, {"name": "5-10-5 Pro Agility Test", "sets": 2, "notes": "Record best time"}, {"name": "Bat Speed Assessment", "sets": 3, "reps": 5, "notes": "Record maximum velocity"}]')
) d(day_num, title, description, exercises)
WHERE p.parent_module = 'hitting' 
  AND p.sub_module = 'production_studio' 
  AND p.sport = 'baseball' 
  AND p.block_number = 1;

-- Seed equipment for all sub-modules
INSERT INTO workout_equipment (sub_module, sport, name, description, is_required, category, purchase_link) VALUES
('production_studio', 'baseball', 'Barbell and Plates', 'Standard Olympic barbell with weight plates for strength training', true, 'Strength Equipment', 'https://www.roguefitness.com/barbells'),
('production_studio', 'baseball', 'Dumbbells', 'Set of dumbbells ranging from 10-75 lbs', true, 'Strength Equipment', 'https://www.roguefitness.com/dumbbells'),
('production_studio', 'baseball', 'Medicine Ball', '10-15 lb medicine ball for rotational throws', true, 'Power Training', 'https://www.roguefitness.com/medicine-balls'),
('production_studio', 'baseball', 'Resistance Bands', 'Heavy resistance bands for speed and mobility work', true, 'Speed Training', 'https://www.roguefitness.com/resistance-bands'),
('production_studio', 'softball', 'Barbell and Plates', 'Standard Olympic barbell with weight plates for strength training', true, 'Strength Equipment', 'https://www.roguefitness.com/barbells'),
('production_studio', 'softball', 'Dumbbells', 'Set of dumbbells ranging from 10-75 lbs', true, 'Strength Equipment', 'https://www.roguefitness.com/dumbbells'),
('production_studio', 'softball', 'Medicine Ball', '10-15 lb medicine ball for rotational throws', true, 'Power Training', 'https://www.roguefitness.com/medicine-balls'),
('production_studio', 'softball', 'Resistance Bands', 'Heavy resistance bands for speed and mobility work', true, 'Speed Training', 'https://www.roguefitness.com/resistance-bands'),
('production_lab', 'baseball', 'Weighted Baseballs', 'Set of weighted balls from 4oz to 12oz', true, 'Arm Strength', 'https://www.driveline.com/products/plyocare-balls'),
('production_lab', 'baseball', 'Long Toss Setup', 'Measured space for long toss program', true, 'Throwing', null),
('production_lab', 'baseball', 'Resistance Bands', 'Arm care and shoulder strength bands', true, 'Arm Care', 'https://www.jaegersports.com/products/'),
('production_lab', 'softball', 'Weighted Softballs', 'Set of weighted balls from 5oz to 14oz', true, 'Arm Strength', 'https://www.driveline.com/products/plyocare-balls'),
('production_lab', 'softball', 'Long Toss Setup', 'Measured space for long toss program', true, 'Throwing', null),
('production_lab', 'softball', 'Resistance Bands', 'Arm care and shoulder strength bands', true, 'Arm Care', 'https://www.jaegersports.com/products/'),
('rainbow_bread', 'baseball', 'Weighted Baseballs', 'Set of weighted balls from 5oz to 9oz for arm strength', true, 'Arm Strength', 'https://www.driveline.com/products/plyocare-balls'),
('rainbow_bread', 'baseball', 'Long Toss Equipment', 'Measured field space for long toss progression', true, 'Throwing', null),
('rainbow_bread', 'baseball', 'Resistance Bands', 'Arm care and rotator cuff strengthening bands', true, 'Arm Care', 'https://www.jaegersports.com/products/'),
('rainbow_bread', 'softball', 'Weighted Softballs', 'Set of weighted balls from 6oz to 10oz for arm strength', true, 'Arm Strength', 'https://www.driveline.com/products/plyocare-balls'),
('rainbow_bread', 'softball', 'Long Toss Equipment', 'Measured field space for long toss progression', true, 'Throwing', null),
('rainbow_bread', 'softball', 'Resistance Bands', 'Arm care and rotator cuff strengthening bands', true, 'Arm Care', 'https://www.jaegersports.com/products/');