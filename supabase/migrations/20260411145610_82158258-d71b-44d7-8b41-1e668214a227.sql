-- Add CHECK constraints for valid enum values
ALTER TABLE baserunning_lessons 
  ADD CONSTRAINT chk_lessons_sport CHECK (sport IN ('baseball', 'softball', 'both'));

ALTER TABLE baserunning_lessons 
  ADD CONSTRAINT chk_lessons_level CHECK (level IN ('beginner', 'advanced', 'elite'));

ALTER TABLE baserunning_scenarios 
  ADD CONSTRAINT chk_scenarios_sport CHECK (sport IN ('baseball', 'softball', 'both'));

ALTER TABLE baserunning_scenarios 
  ADD CONSTRAINT chk_scenarios_difficulty CHECK (difficulty IN ('easy', 'game_speed', 'elite'));

-- Add index for sport-filtered queries
CREATE INDEX idx_baserunning_lessons_sport ON baserunning_lessons (sport);