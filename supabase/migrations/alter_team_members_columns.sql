-- Migration: Add skills, github, and linkedin columns to team_members table
-- Run this in your Supabase SQL Editor if you prefer manual migration.

-- 1. Add columns to team_members table
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS skills text[],
ADD COLUMN IF NOT EXISTS github text,
ADD COLUMN IF NOT EXISTS linkedin text;

-- 2. Notify PostgREST to reload the schema cache so columns are immediately queryable via REST
NOTIFY pgrst, 'reload schema';
