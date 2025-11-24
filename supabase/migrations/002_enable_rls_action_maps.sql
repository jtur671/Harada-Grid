-- Enable Row Level Security (RLS) for action_maps table
-- This ensures users can only access their own maps, even if application code has bugs
-- Run this in your Supabase SQL Editor

-- Enable RLS on action_maps table
ALTER TABLE action_maps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT (read) their own action maps
CREATE POLICY "Users can view own action maps"
  ON action_maps FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only INSERT (create) action maps with their own user_id
CREATE POLICY "Users can insert own action maps"
  ON action_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE (modify) their own action maps
CREATE POLICY "Users can update own action maps"
  ON action_maps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own action maps
CREATE POLICY "Users can delete own action maps"
  ON action_maps FOR DELETE
  USING (auth.uid() = user_id);

-- Note: Service role (used by webhooks) bypasses RLS automatically
-- Application code should still verify user_id as defense in depth

