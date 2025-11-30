-- Insert 21 missing softball speed workout templates for Production Studio Block 1
-- Softball Block 1 Program ID: f385464a-c388-4b3c-bd9f-c123dffc32e7

-- Day 2: Linear Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  2,
  'Linear Speed Development',
  'Build straight-line speed with 60-foot base sprints and acceleration work',
  'speed',
  '[
    {"name": "Sprint Intervals", "sets": 6, "distance": "60 feet", "rest": "45 seconds", "notes": "Full base-to-base distance, game-speed effort"},
    {"name": "Home-to-First Sprints", "sets": 6, "distance": "60 feet", "rest": "60 seconds", "notes": "Simulate batter''s box start, run through the bag"},
    {"name": "Flying 10s", "sets": 4, "distance": "10 yards", "notes": "Build up 20 yards then max speed for 10 yards"},
    {"name": "Acceleration Mechanics", "sets": 4, "distance": "30 feet", "rest": "45 seconds", "notes": "Focus on first 3 explosive steps"}
  ]'::jsonb,
  35,
  ARRAY['cones', 'stopwatch']
);

-- Day 4: Lateral Quickness
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  4,
  'Lateral Quickness & Agility',
  'Develop side-to-side quickness for infield positioning and defensive reactions',
  'speed',
  '[
    {"name": "Lateral Shuffle Drills", "sets": 4, "duration": "15 seconds", "rest": "30 seconds", "notes": "Stay low, quick feet - infielder positioning stance"},
    {"name": "5-10-5 Pro Agility", "sets": 4, "rest": "60 seconds", "notes": "5 yards each direction with sharp cuts"},
    {"name": "Lateral Bound Series", "sets": 3, "reps": "8 each direction", "rest": "45 seconds", "notes": "Explosive lateral push for diving plays"},
    {"name": "Carioca Runs", "sets": 4, "distance": "30 feet", "rest": "30 seconds", "notes": "Hip mobility and lateral coordination"}
  ]'::jsonb,
  30,
  ARRAY['cones', 'agility ladder']
);

-- Day 6: Rotational Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  6,
  'Rotational Speed & Power',
  'Maximize bat speed and rotational power through explosive movements',
  'speed',
  '[
    {"name": "Medicine Ball Rotational Throws", "sets": 4, "reps": "8 each side", "rest": "45 seconds", "notes": "Maximum velocity, hip-to-hand power chain"},
    {"name": "Overspeed Bat Swings", "sets": 5, "reps": 10, "rest": "30 seconds", "notes": "Underload bat, max intent swing speed"},
    {"name": "Cable Rotations", "sets": 3, "reps": "12 each side", "rest": "30 seconds", "notes": "Speed with control, resist rotation on return"},
    {"name": "Rotational Medicine Ball Slams", "sets": 3, "reps": "10 each side", "rest": "45 seconds", "notes": "Explosive hip rotation into slam"}
  ]'::jsonb,
  40,
  ARRAY['medicine ball', 'underload bat', 'cable machine']
);

-- Day 8: Reactive Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  8,
  'Reactive Speed & First-Step Quickness',
  'Develop reaction time and explosive first-step acceleration for defensive plays',
  'speed',
  '[
    {"name": "Reactive Cone Drills", "sets": 6, "rest": "45 seconds", "notes": "Partner calls direction - simulate fielding reads"},
    {"name": "Ball Drop Sprints", "sets": 5, "rest": "60 seconds", "notes": "React to visual cue, sprint to catch before second bounce"},
    {"name": "First-Step Explosions", "sets": 6, "distance": "10 feet", "rest": "30 seconds", "notes": "Defensive first-step quickness from ready position"},
    {"name": "Mirror Drills", "sets": 4, "duration": "20 seconds", "rest": "40 seconds", "notes": "React and mirror partner''s movements"}
  ]'::jsonb,
  35,
  ARRAY['cones', 'tennis balls', 'partner']
);

-- Day 10: Hand Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  10,
  'Hand Speed & Bat Control',
  'Develop lightning-quick hands for hitting and fielding transitions',
  'speed',
  '[
    {"name": "Quick Hands Ball Transfers", "sets": 4, "reps": 20, "rest": "30 seconds", "notes": "Glove to throwing hand speed - simulate double play feeds"},
    {"name": "Rapid Fire Tee Work", "sets": 5, "reps": 10, "rest": "45 seconds", "notes": "Quick swing resets, bat speed focus with control"},
    {"name": "Reaction Ball Catches", "sets": 4, "duration": "60 seconds", "rest": "45 seconds", "notes": "Hand-eye coordination and quick reflexive catches"},
    {"name": "Speed Bag Work", "sets": 3, "duration": "90 seconds", "rest": "60 seconds", "notes": "Hand speed and rhythm development"}
  ]'::jsonb,
  35,
  ARRAY['softball glove', 'tee', 'reaction ball', 'speed bag']
);

-- Day 12: Multi-Directional Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  12,
  'Multi-Directional Movement',
  'Master changes of direction for complete field coverage and defensive range',
  'speed',
  '[
    {"name": "T-Drill", "sets": 5, "rest": "60 seconds", "notes": "Forward sprint, lateral shuffle, backpedal - 15 feet each"},
    {"name": "W-Drill", "sets": 4, "rest": "60 seconds", "notes": "Outfielder patterns with direction changes"},
    {"name": "Box Drill", "sets": 4, "rest": "45 seconds", "notes": "Four-corner agility in 15-foot square"},
    {"name": "Star Drill", "sets": 3, "rest": "60 seconds", "notes": "Five-direction explosive starts from center"}
  ]'::jsonb,
  35,
  ARRAY['cones', 'agility markers']
);

-- Day 14: Explosive Starts
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  14,
  'Explosive Starting Mechanics',
  'Perfect your acceleration from various starting positions',
  'speed',
  '[
    {"name": "Standing Start Sprints", "sets": 6, "distance": "30 feet", "rest": "45 seconds", "notes": "Explosive first 3 steps from athletic stance"},
    {"name": "Falling Start Sprints", "sets": 5, "distance": "40 feet", "rest": "60 seconds", "notes": "Forward lean momentum into explosive sprint"},
    {"name": "Crouch Start Sprints", "sets": 5, "distance": "60 feet", "rest": "60 seconds", "notes": "Batter''s box position simulating home-to-first"},
    {"name": "Push-Up Start Sprints", "sets": 4, "distance": "30 feet", "rest": "60 seconds", "notes": "Ground reaction force into immediate acceleration"}
  ]'::jsonb,
  35,
  ARRAY['cones', 'stopwatch']
);

-- Day 16: Base Running Acceleration
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  16,
  'Base Running Speed & Technique',
  'Master 60-foot base running with proper turns and acceleration',
  'speed',
  '[
    {"name": "Home-to-Second Sprints", "sets": 4, "distance": "120 feet", "rest": "90 seconds", "notes": "Full effort with proper first base turn"},
    {"name": "Secondary Lead Jumps", "sets": 6, "distance": "12 feet", "rest": "45 seconds", "notes": "Explosive secondary lead on pitcher release"},
    {"name": "Round-the-Base Drills", "sets": 5, "rest": "60 seconds", "notes": "Proper angle and speed through first base turn"},
    {"name": "Tag-Up Sprints", "sets": 5, "distance": "60 feet", "rest": "60 seconds", "notes": "Explosive start after simulated catch"}
  ]'::jsonb,
  40,
  ARRAY['bases', 'cones', 'stopwatch']
);

-- Day 18: Deceleration & Change of Direction
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  18,
  'Controlled Deceleration',
  'Learn to stop and change direction efficiently without injury risk',
  'speed',
  '[
    {"name": "Sprint-to-Stop Drills", "sets": 5, "distance": "40 feet", "rest": "45 seconds", "notes": "Full sprint then controlled 3-step deceleration"},
    {"name": "180-Degree Turns", "sets": 4, "distance": "30 feet each", "rest": "60 seconds", "notes": "Sprint, plant, reverse direction explosively"},
    {"name": "Curved Run Patterns", "sets": 4, "rest": "60 seconds", "notes": "Practice efficient base running curves"},
    {"name": "Stop-and-Go Intervals", "sets": 5, "distance": "60 feet", "rest": "60 seconds", "notes": "Accelerate, decelerate, re-accelerate pattern"}
  ]'::jsonb,
  35,
  ARRAY['cones', 'agility markers']
);

-- Day 20: Plyometric Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  20,
  'Plyometric Speed Development',
  'Build explosive power through jumping and bounding exercises',
  'speed',
  '[
    {"name": "Box Jump to Sprint", "sets": 5, "rest": "60 seconds", "notes": "Jump onto 20-inch box, immediately sprint 30 feet"},
    {"name": "Broad Jump Series", "sets": 4, "reps": 5, "rest": "60 seconds", "notes": "Consecutive horizontal jumps for distance"},
    {"name": "Single-Leg Bounds", "sets": 3, "reps": "8 each leg", "rest": "60 seconds", "notes": "Maximize horizontal distance per bound"},
    {"name": "Depth Jumps to Sprint", "sets": 4, "rest": "90 seconds", "notes": "Drop from 18-inch box, immediate max sprint"}
  ]'::jsonb,
  40,
  ARRAY['plyo boxes', 'cones']
);

-- Day 22: Footwork Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  22,
  'Quick Feet & Footwork Drills',
  'Develop rapid foot turnover and coordinated footwork patterns',
  'speed',
  '[
    {"name": "Ladder Drills - Icky Shuffle", "sets": 4, "rest": "30 seconds", "notes": "In-in-out-out pattern at maximum speed"},
    {"name": "Ladder Drills - Two-Foot Hops", "sets": 4, "rest": "30 seconds", "notes": "Quick two-foot hops through each ladder square"},
    {"name": "Jump Rope Speed Intervals", "sets": 5, "duration": "30 seconds", "rest": "30 seconds", "notes": "Maximum turnover speed"},
    {"name": "Dot Drills", "sets": 4, "rest": "45 seconds", "notes": "Five-dot pattern with explosive foot contacts"}
  ]'::jsonb,
  30,
  ARRAY['agility ladder', 'jump rope', 'dot drill mat']
);

-- Day 24: Game Speed Simulation
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  24,
  'Game-Speed Situations',
  'Practice speed in softball-specific game scenarios',
  'speed',
  '[
    {"name": "Bunt-and-Run Sprints", "sets": 5, "distance": "60 feet", "rest": "60 seconds", "notes": "Simulate bunt execution into immediate sprint"},
    {"name": "Steal Attempt Starts", "sets": 6, "distance": "75 feet", "rest": "60 seconds", "notes": "Secondary lead to stolen base sprint"},
    {"name": "Infield-to-First Throws", "sets": 5, "rest": "60 seconds", "notes": "Field ground ball, quick release sprint to first"},
    {"name": "Outfield Gap Sprints", "sets": 4, "distance": "80 feet", "rest": "90 seconds", "notes": "Full sprint tracking fly ball in gap"}
  ]'::jsonb,
  40,
  ARRAY['softballs', 'glove', 'bases', 'cones']
);

-- Day 26: Upper Body Speed
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  26,
  'Upper Body Speed & Arm Action',
  'Develop quick arm swing and upper body contribution to speed',
  'speed',
  '[
    {"name": "Arm Swing Drills - Seated", "sets": 4, "duration": "20 seconds", "rest": "30 seconds", "notes": "Maximum speed arm swings from seated position"},
    {"name": "Medicine Ball Chest Pass", "sets": 4, "reps": 10, "rest": "45 seconds", "notes": "Explosive upper body power"},
    {"name": "Battle Rope Waves", "sets": 4, "duration": "30 seconds", "rest": "45 seconds", "notes": "Maximum speed alternating waves"},
    {"name": "Plyo Push-Ups", "sets": 3, "reps": 8, "rest": "60 seconds", "notes": "Explosive upper body power for throwing velocity"}
  ]'::jsonb,
  35,
  ARRAY['medicine ball', 'battle ropes', 'mat']
);

-- Day 28: Sprint Endurance
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  28,
  'Speed Endurance & Repeated Sprints',
  'Maintain maximum speed over multiple repetitions',
  'speed',
  '[
    {"name": "300-Yard Shuttle", "sets": 2, "rest": "3 minutes", "notes": "5 x 60 feet with turns - maintain speed throughout"},
    {"name": "Repeated 60-Foot Sprints", "sets": 8, "distance": "60 feet", "rest": "30 seconds", "notes": "Short rest maintains speed under fatigue"},
    {"name": "Base-to-Base Intervals", "sets": 6, "distance": "60 feet", "rest": "45 seconds", "notes": "Game-speed effort with minimal rest"},
    {"name": "Tempo Runs", "sets": 3, "distance": "150 feet", "rest": "90 seconds", "notes": "80% effort maintaining form"}
  ]'::jsonb,
  40,
  ARRAY['cones', 'stopwatch', 'bases']
);

-- Day 30: Acceleration Mechanics Refinement
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  30,
  'Technical Acceleration Work',
  'Perfect acceleration mechanics with focused technical drills',
  'speed',
  '[
    {"name": "Wall Drill - Acceleration Position", "sets": 4, "duration": "30 seconds", "rest": "45 seconds", "notes": "Body angle and leg drive mechanics"},
    {"name": "Falling Starts with Video", "sets": 5, "distance": "30 feet", "rest": "90 seconds", "notes": "Record and analyze acceleration technique"},
    {"name": "Resisted Sprints - Band", "sets": 5, "distance": "40 feet", "rest": "90 seconds", "notes": "Partner provides light resistance"},
    {"name": "Wicket Runs", "sets": 4, "distance": "50 feet", "rest": "60 seconds", "notes": "Mini-hurdles spaced for optimal stride length"}
  ]'::jsonb,
  40,
  ARRAY['resistance band', 'mini hurdles', 'video camera', 'partner']
);

-- Day 32: Overspeed Training
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  32,
  'Overspeed Methods',
  'Train the nervous system to move faster than normal max speed',
  'speed',
  '[
    {"name": "Downhill Sprints (3-degree slope)", "sets": 5, "distance": "50 feet", "rest": "2 minutes", "notes": "Slight decline for overspeed without loss of control"},
    {"name": "Assisted Sprints - Band Pull", "sets": 4, "distance": "40 feet", "rest": "2 minutes", "notes": "Partner provides forward assistance"},
    {"name": "High-Speed Treadmill Intervals", "sets": 5, "duration": "15 seconds", "rest": "90 seconds", "notes": "105-110% of normal max speed"},
    {"name": "Wind-Assisted Sprints", "sets": 4, "distance": "60 feet", "rest": "90 seconds", "notes": "Sprint with strong tailwind when available"}
  ]'::jsonb,
  40,
  ARRAY['resistance band', 'partner', 'slight decline', 'treadmill']
);

-- Day 34: Coordination & Rhythm
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  34,
  'Movement Coordination & Timing',
  'Develop rhythm and coordination for efficient movement patterns',
  'speed',
  '[
    {"name": "Rhythm Ladder Drills", "sets": 4, "rest": "30 seconds", "notes": "Emphasis on rhythmic foot contacts, not pure speed"},
    {"name": "Skipping Variations", "sets": 4, "distance": "60 feet", "rest": "30 seconds", "notes": "A-skip, B-skip, power skip progression"},
    {"name": "Bounding with Rhythm", "sets": 4, "distance": "50 feet", "rest": "60 seconds", "notes": "Consistent rhythm through bounding sequence"},
    {"name": "Crossover Steps", "sets": 4, "distance": "40 feet", "rest": "30 seconds", "notes": "Smooth crossover technique at increasing speeds"}
  ]'::jsonb,
  35,
  ARRAY['agility ladder', 'cones', 'open space']
);

-- Day 36: Speed Under Pressure
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  36,
  'Competitive Speed Work',
  'Execute speed under competitive pressure and fatigue',
  'speed',
  '[
    {"name": "Partner Race Sprints", "sets": 6, "distance": "60 feet", "rest": "90 seconds", "notes": "Head-to-head competition for max effort"},
    {"name": "Chase-Down Drills", "sets": 5, "distance": "80 feet", "rest": "90 seconds", "notes": "One player 10-foot head start, other chases"},
    {"name": "Relay Races", "sets": 4, "rest": "2 minutes", "notes": "Team 4x60 relays with handoff transitions"},
    {"name": "Timed Base Running", "sets": 4, "rest": "90 seconds", "notes": "Record and compete for best home-to-first times"}
  ]'::jsonb,
  40,
  ARRAY['stopwatch', 'bases', 'partner/team', 'cones']
);

-- Day 38: Speed Maintenance & Recovery
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  38,
  'Active Recovery Speed Work',
  'Maintain speed adaptations with lower-intensity technical work',
  'speed',
  '[
    {"name": "Tempo Sprints (75% effort)", "sets": 5, "distance": "60 feet", "rest": "60 seconds", "notes": "Focus on perfect mechanics at submaximal speed"},
    {"name": "Dynamic Flexibility Flow", "sets": 3, "duration": "5 minutes", "rest": "90 seconds", "notes": "Leg swings, walking lunges, high knees at controlled pace"},
    {"name": "Light Ladder Work", "sets": 4, "rest": "45 seconds", "notes": "Technical footwork patterns at 70% speed"},
    {"name": "Stride Outs", "sets": 6, "distance": "80 feet", "rest": "90 seconds", "notes": "Gradual build to 80% speed, focus on relaxation"}
  ]'::jsonb,
  30,
  ARRAY['agility ladder', 'cones', 'open space']
);

-- Day 40: Maximum Velocity Development
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  40,
  'Top-End Speed Training',
  'Develop maximum velocity sprint mechanics and speed',
  'speed',
  '[
    {"name": "Flying 20s", "sets": 5, "distance": "20 yards", "rest": "2 minutes", "notes": "30-yard buildup then max speed for 20 yards"},
    {"name": "Long Acceleration Sprints", "sets": 4, "distance": "100 feet", "rest": "3 minutes", "notes": "Reach and maintain top speed"},
    {"name": "Wicket Sprints - Wide Spacing", "sets": 4, "distance": "60 feet", "rest": "2 minutes", "notes": "Hurdles spaced for max velocity stride length"},
    {"name": "Sprint-Float-Sprint", "sets": 4, "rest": "2 minutes", "notes": "20-foot sprint, 20-foot float (relax), 20-foot sprint"}
  ]'::jsonb,
  45,
  ARRAY['cones', 'stopwatch', 'mini hurdles']
);

-- Day 42: Speed Testing & Assessment
INSERT INTO workout_templates (program_id, day_in_cycle, title, description, workout_type, exercises, estimated_duration_minutes, equipment_needed)
VALUES (
  'f385464a-c388-4b3c-bd9f-c123dffc32e7',
  42,
  'Block 1 Speed Assessment',
  'Test and measure all speed qualities developed during Block 1',
  'speed',
  '[
    {"name": "Home-to-First Time Trial", "sets": 2, "distance": "60 feet", "rest": "5 minutes", "notes": "Record best time, compare to Block 1 start"},
    {"name": "Pro Agility Test (5-10-5)", "sets": 2, "rest": "3 minutes", "notes": "Record best time for lateral quickness"},
    {"name": "Flying 10-Yard Sprint", "sets": 2, "rest": "3 minutes", "notes": "Measure maximum velocity with 20-yard buildup"},
    {"name": "Broad Jump Test", "sets": 2, "rest": "2 minutes", "notes": "Record best horizontal jump distance"},
    {"name": "Reactive Shuttle", "sets": 2, "rest": "3 minutes", "notes": "Partner calls direction changes, record time"}
  ]'::jsonb,
  45,
  ARRAY['stopwatch', 'measuring tape', 'cones', 'bases', 'partner']
);