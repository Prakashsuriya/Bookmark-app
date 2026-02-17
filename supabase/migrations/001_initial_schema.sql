-- Drop existing table if exists (to recreate with correct types)
DROP TABLE IF EXISTS bookmarks;

-- Create bookmarks table with TEXT user_id to support OAuth providers
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: RLS is disabled - authentication is handled by NextAuth via API routes

-- Enable Realtime for bookmarks table
-- This adds the table to the realtime publication
-- If the table is already in the publication, this will show a notice but not fail
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
