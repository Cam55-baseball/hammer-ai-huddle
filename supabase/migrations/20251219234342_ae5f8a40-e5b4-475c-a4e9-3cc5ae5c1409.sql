-- Create weather_favorite_locations table for storing user's favorite weather locations
CREATE TABLE weather_favorite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE weather_favorite_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view own favorites" 
  ON weather_favorite_locations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" 
  ON weather_favorite_locations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" 
  ON weather_favorite_locations 
  FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites" 
  ON weather_favorite_locations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create index for faster user lookups
CREATE INDEX idx_weather_favorite_locations_user_id ON weather_favorite_locations(user_id);

-- Ensure only one default per user
CREATE UNIQUE INDEX idx_weather_favorite_locations_default ON weather_favorite_locations(user_id) WHERE is_default = true;