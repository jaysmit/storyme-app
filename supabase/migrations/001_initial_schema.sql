-- StoryMe Initial Schema
-- Run this migration to set up all tables

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Characters (people transformed into storybook characters)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_photo_url TEXT NOT NULL,
  generated_image_url TEXT,
  generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  character_type TEXT DEFAULT 'person' CHECK (character_type IN ('person', 'pet')),
  age_group TEXT CHECK (age_group IN ('child', 'adult', 'senior', NULL)),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_characters_user_id ON characters(user_id);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE USING (auth.uid() = user_id);

-- Crews (saved groups of characters)
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crews_user_id ON crews(user_id);

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crews" ON crews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crews" ON crews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crews" ON crews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crews" ON crews
  FOR DELETE USING (auth.uid() = user_id);

-- Crew members (join table)
CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role TEXT,
  UNIQUE(crew_id, character_id)
);

CREATE INDEX idx_crew_members_crew_id ON crew_members(crew_id);
CREATE INDEX idx_crew_members_character_id ON crew_members(character_id);

ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;

-- Allow users to manage crew members for their own crews
CREATE POLICY "Users can view crew members of own crews" ON crew_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM crews WHERE crews.id = crew_members.crew_id AND crews.user_id = auth.uid())
  );

CREATE POLICY "Users can insert crew members to own crews" ON crew_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM crews WHERE crews.id = crew_members.crew_id AND crews.user_id = auth.uid())
  );

CREATE POLICY "Users can update crew members of own crews" ON crew_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM crews WHERE crews.id = crew_members.crew_id AND crews.user_id = auth.uid())
  );

CREATE POLICY "Users can delete crew members from own crews" ON crew_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM crews WHERE crews.id = crew_members.crew_id AND crews.user_id = auth.uid())
  );

-- Stories (predefined story templates)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  cover_image_url TEXT,
  page_count INT DEFAULT 24,
  category TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stories_slug ON stories(slug);
CREATE INDEX idx_stories_category ON stories(category);

-- Stories are public (no RLS needed for read)
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stories" ON stories FOR SELECT USING (true);

-- Art styles (7 predefined styles)
CREATE TABLE art_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  prompt_modifier TEXT,
  ages TEXT
);

CREATE INDEX idx_art_styles_slug ON art_styles(slug);

ALTER TABLE art_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view art styles" ON art_styles FOR SELECT USING (true);

-- Books (user's created books)
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crew_id UUID REFERENCES crews(id),
  story_id UUID REFERENCES stories(id),
  art_style_id UUID REFERENCES art_styles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'preview_ready', 'purchased')),
  preview_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_status ON books(status);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own books" ON books
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own books" ON books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" ON books
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" ON books
  FOR DELETE USING (auth.uid() = user_id);

-- Seed stories
INSERT INTO stories (slug, title, tagline, description, category, page_count, is_featured) VALUES
  ('dragon-castle-valley', 'The Dragon of Castle Valley', 'A dragon guards the road to the glowing castle. Only a brave crew can win their way past.', 'An epic fantasy adventure where your family must work together to outsmart a fearsome dragon and reach the enchanted castle.', 'fantasy', 24, true),
  ('fairy-glade', 'The Fairy Glade', 'Follow the fireflies past the mushroom houses to a glade where the fairies are waiting.', 'A magical journey through an enchanted forest where your family discovers the secret world of the fairies.', 'magical', 24, true),
  ('grand-final-day', 'Grand Final Day', 'One game, one final siren, and a whole family in the stands cheering.', 'The big game is here! Your family stars in this heartwarming sports story about teamwork and never giving up.', 'sports', 24, false),
  ('cloud-ship', 'Captain of the Cloud Ship', 'Your little one takes the helm of a flying ship, with family as the crew.', 'Set sail through the clouds on an adventure above the world, with your child as the brave captain.', 'adventure', 24, true),
  ('super-squad', 'The Super Squad and the Sorceress', 'A cheeky sorceress is turning the city upside down. Time to suit up.', 'Your family becomes a team of superheroes to save the city from a mischievous but not-so-evil sorceress.', 'superhero', 24, false),
  ('galaxy-road-trip', 'The Great Galaxy Road Trip', 'An old rocket turns out to be the fastest ride in the galaxy — and home before bedtime.', 'Blast off on a cosmic adventure through the solar system and beyond with your family as space explorers.', 'space', 24, true);

-- Seed art styles
INSERT INTO art_styles (slug, name, description, prompt_modifier, ages) VALUES
  ('glow', 'Enchanted glow', 'Our signature look. Rich painted light, golden sparkles and starry skies — pure bedtime wonder.', 'rich painted light with golden sparkles and starry skies, warm enchanted atmosphere, magical glow effects', '3–10'),
  ('watercolour', 'Watercolour dream', 'Soft washes and pastel skies that melt into the page. Gentle, calm and dreamy.', 'soft watercolor washes and pastel skies, gentle dreamy atmosphere, delicate brush strokes', '0–5'),
  ('sketch', 'Pencil sketch', 'Hand-drawn graphite on cream paper, like an illustrator''s sketchbook come to life.', 'hand-drawn graphite pencil on cream paper, detailed sketch style, illustrator''s sketchbook feel', '3–10'),
  ('papercut', 'Paper-cut', 'Layered paper and felt with real depth and texture, like a handmade pop-up book.', 'layered paper-cut collage with felt textures, 3D depth and shadows, handmade craft aesthetic', '2–8'),
  ('anim', '3D animated', 'Cinematic, glossy and bursting with colour, like stepping into an animated film.', '3D animated Pixar-style, glossy cinematic rendering, vibrant colors and smooth surfaces', '4–10'),
  ('silhouette', 'Shadow silhouette', 'Bold black silhouettes against a glowing sunset sky, like a shadow-puppet show.', 'bold black silhouettes against glowing sunset sky, shadow-puppet style, dramatic contrast', '3–10'),
  ('bricks', 'Toy bricks', 'A whole world built from bright toy bricks — castles, dragons and all.', 'LEGO toy brick world, everything built from colorful plastic bricks, playful and geometric', '3–10');
