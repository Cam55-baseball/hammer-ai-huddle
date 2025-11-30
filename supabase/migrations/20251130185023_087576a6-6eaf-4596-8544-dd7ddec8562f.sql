-- Replace eccentric/isometric exercises with concentric alternatives in Production Studio strength workouts
-- This applies to all 22 strength templates (11 baseball + 11 softball)

-- Update exercises in workout_templates for Production Studio strength workouts
UPDATE workout_templates wt
SET exercises = (
  SELECT jsonb_agg(
    CASE 
      -- Replace Romanian Deadlift with Hip Thrust
      WHEN exercise->>'name' = 'Romanian Deadlift' THEN
        jsonb_build_object(
          'name', 'Hip Thrust',
          'sets', exercise->>'sets',
          'reps', exercise->>'reps',
          'rest', exercise->>'rest',
          'intensity', exercise->>'intensity',
          'notes', 'Barbell on hips, shoulders on bench. Drive through heels. Pure concentric hip extension power.'
        )
      
      -- Replace Single-Leg RDL with Single-Leg Hip Thrust
      WHEN exercise->>'name' = 'Single-Leg RDL' THEN
        jsonb_build_object(
          'name', 'Single-Leg Hip Thrust',
          'sets', exercise->>'sets',
          'reps', exercise->>'reps',
          'rest', exercise->>'rest',
          'intensity', exercise->>'intensity',
          'notes', 'Foot elevated on bench, drive through heel. Pure concentric glute power for unilateral stability.'
        )
      
      -- Replace Pallof Press Hold with Cable Rotational Chop
      WHEN exercise->>'name' = 'Pallof Press Hold' THEN
        jsonb_build_object(
          'name', 'Cable Rotational Chop',
          'sets', exercise->>'sets',
          'reps', '8 each side',
          'rest', exercise->>'rest',
          'intensity', 'Moderate resistance',
          'notes', 'High to low diagonal chop. Explosive rotation, anti-rotation control on return. Dynamic core power.'
        )
      
      -- Replace Push-Up Plank Hold with Explosive Push-Up
      WHEN exercise->>'name' = 'Push-Up Plank Hold' THEN
        jsonb_build_object(
          'name', 'Explosive Push-Up',
          'sets', exercise->>'sets',
          'reps', '5-6',
          'rest', exercise->>'rest',
          'intensity', 'Max effort',
          'notes', 'Explode up, hands leave ground. Concentric upper body power and fast-twitch activation.'
        )
      
      -- Replace Dead Bug Hold with Medicine Ball Slam
      WHEN exercise->>'name' = 'Dead Bug Hold' THEN
        jsonb_build_object(
          'name', 'Medicine Ball Slam',
          'sets', exercise->>'sets',
          'reps', '6-8',
          'rest', exercise->>'rest',
          'intensity', 'Moderate MB (8-12 lbs)',
          'notes', 'Overhead to ground slam. Explosive core flexion and total body power transfer.'
        )
      
      -- Replace Side Plank Hold with Lateral Cable Press
      WHEN exercise->>'name' = 'Side Plank Hold' THEN
        jsonb_build_object(
          'name', 'Lateral Cable Press',
          'sets', exercise->>'sets',
          'reps', '8 each side',
          'rest', exercise->>'rest',
          'intensity', 'Moderate resistance',
          'notes', 'Press cable across body. Dynamic anti-rotation and lateral core strength.'
        )
      
      -- Keep all other exercises unchanged
      ELSE exercise
    END
  )
  FROM jsonb_array_elements(wt.exercises) AS exercise
)
FROM workout_programs wp
WHERE wt.program_id = wp.id
  AND wp.sub_module = 'production_studio'
  AND wt.workout_type = 'strength';

-- Log the migration
INSERT INTO audit_log (user_id, action, table_name, metadata)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'migration',
  'workout_templates',
  jsonb_build_object(
    'description', 'Replaced eccentric/isometric exercises with concentric alternatives in Production Studio strength workouts',
    'affected_rows', (SELECT COUNT(*) FROM workout_templates wt JOIN workout_programs wp ON wt.program_id = wp.id WHERE wp.sub_module = 'production_studio' AND wt.workout_type = 'strength')
  )
);