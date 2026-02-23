-- ============================================================
-- SYNAPZ — Supabase Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- WORKSPACES TABLE (stores both top-level classes AND modules)
-- parent_id = NULL → top-level workspace (class)
-- parent_id = <id> → module inside a workspace
CREATE TABLE workspaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '📚',
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- MODULE DATA TABLE (stores flashcards, quiz, fillin for each module)
CREATE TABLE module_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flashcards jsonb DEFAULT '[]'::jsonb,
  quiz jsonb DEFAULT '[]'::jsonb,
  fillin jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(module_id, user_id)
);

-- INDEXES for fast queries
CREATE INDEX workspaces_user_id_idx ON workspaces(user_id);
CREATE INDEX workspaces_parent_id_idx ON workspaces(parent_id);
CREATE INDEX module_data_module_id_idx ON module_data(module_id);
CREATE INDEX module_data_user_id_idx ON module_data(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- IMPORTANT: Enable RLS to protect user data
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_data ENABLE ROW LEVEL SECURITY;

-- Users can only see their own workspaces
CREATE POLICY "Users can view own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON workspaces FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only see their own module data
CREATE POLICY "Users can view own module data"
  ON module_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own module data"
  ON module_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own module data"
  ON module_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own module data"
  ON module_data FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- OPTIONAL: Auto-update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_module_data_updated_at
  BEFORE UPDATE ON module_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
