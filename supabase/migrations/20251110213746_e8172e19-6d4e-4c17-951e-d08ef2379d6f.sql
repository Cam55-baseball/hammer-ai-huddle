-- Create enums for constrained values
CREATE TYPE throwing_hand AS ENUM ('R', 'L', 'B');
CREATE TYPE batting_side AS ENUM ('R', 'L', 'B');
CREATE TYPE commitment_status AS ENUM ('committed', 'uncommitted');

-- Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN throwing_hand throwing_hand,
  ADD COLUMN batting_side batting_side,
  ADD COLUMN commitment_status commitment_status,
  ADD COLUMN high_school_grad_year integer,
  ADD COLUMN college_grad_year integer,
  ADD COLUMN enrolled_in_college boolean DEFAULT false,
  ADD COLUMN is_professional boolean DEFAULT false,
  ADD COLUMN is_free_agent boolean DEFAULT false,
  ADD COLUMN mlb_affiliate text,
  ADD COLUMN independent_league text,
  ADD COLUMN is_foreign_player boolean DEFAULT false;

-- Add indexes for common filter queries
CREATE INDEX idx_profiles_position ON profiles(position);
CREATE INDEX idx_profiles_state ON profiles(state);
CREATE INDEX idx_profiles_throwing_hand ON profiles(throwing_hand);
CREATE INDEX idx_profiles_batting_side ON profiles(batting_side);
CREATE INDEX idx_profiles_commitment_status ON profiles(commitment_status);
CREATE INDEX idx_profiles_high_school_grad_year ON profiles(high_school_grad_year);
CREATE INDEX idx_profiles_is_professional ON profiles(is_professional);