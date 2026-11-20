-- Admin role system for StoryMe
-- Add is_admin flag to profiles table

-- Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN profiles.is_admin IS 'Whether user has admin access to analytics dashboard';

-- Index for quick admin lookups
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON profiles(is_admin) WHERE is_admin = TRUE;

-- RLS policy: only admins can see the is_admin column of other users
-- (Users can still see their own profile including is_admin)

-- Note: The admin dashboard uses service role to bypass RLS,
-- so we don't need special RLS policies for admin access.
-- Regular users cannot see other users' admin status through normal queries.

-- To set a user as admin, run:
-- UPDATE profiles SET is_admin = TRUE WHERE id = 'user-uuid-here';
-- Or via email:
-- UPDATE profiles SET is_admin = TRUE WHERE email = 'admin@example.com';
