-- ============================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ============================================

-- Index for PlayersClub library queries
-- Speeds up: SELECT * FROM videos WHERE user_id = ? AND saved_to_library = true
CREATE INDEX IF NOT EXISTS idx_videos_user_library 
ON videos(user_id, saved_to_library) 
WHERE saved_to_library = true;

-- Index for PlayersClub filtering by sport and module
-- Speeds up: SELECT * FROM videos WHERE user_id = ? AND sport = ? AND module = ?
CREATE INDEX IF NOT EXISTS idx_videos_user_sport_module 
ON videos(user_id, sport, module);

-- Index for session date ordering (most recent first)
-- Speeds up: ORDER BY session_date DESC
CREATE INDEX IF NOT EXISTS idx_videos_session_date 
ON videos(session_date DESC);

-- Index for scout searches filtering players
-- Speeds up: SELECT * FROM profiles WHERE position = ? AND state = ?
CREATE INDEX IF NOT EXISTS idx_profiles_position 
ON profiles(position) 
WHERE position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_state 
ON profiles(state) 
WHERE state IS NOT NULL;

-- Composite index for multiple profile filters
CREATE INDEX IF NOT EXISTS idx_profiles_search_filters 
ON profiles(position, throwing_hand, batting_side, state);

-- Index for scout follow queries
-- Speeds up: SELECT * FROM scout_follows WHERE scout_id = ? AND status = 'accepted'
CREATE INDEX IF NOT EXISTS idx_scout_follows_scout_status 
ON scout_follows(scout_id, status);

-- Index for player follow queries (checking who follows them)
-- Speeds up: SELECT * FROM scout_follows WHERE player_id = ?
CREATE INDEX IF NOT EXISTS idx_scout_follows_player 
ON scout_follows(player_id);

-- Index for video sharing visibility (scouts viewing shared videos)
-- Speeds up: SELECT * FROM videos WHERE shared_with_scouts = true AND user_id IN (...)
CREATE INDEX IF NOT EXISTS idx_videos_shared 
ON videos(shared_with_scouts, user_id) 
WHERE shared_with_scouts = true;

-- Index for efficiency score filtering and sorting
-- Speeds up: ORDER BY efficiency_score DESC
CREATE INDEX IF NOT EXISTS idx_videos_efficiency_score 
ON videos(efficiency_score DESC) 
WHERE efficiency_score IS NOT NULL;