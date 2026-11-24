-- Migration: Story Favorites Table
-- Allows users to favorite story templates (blueprints)

-- Create story_favorites table
CREATE TABLE IF NOT EXISTS story_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, story_slug)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_favorites_user_id ON story_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_story_favorites_story_slug ON story_favorites(story_slug);

-- Enable RLS
ALTER TABLE story_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see/manage their own favorites
CREATE POLICY "Users can view own story favorites"
  ON story_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add story favorites"
  ON story_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own story favorites"
  ON story_favorites FOR DELETE
  USING (auth.uid() = user_id);
