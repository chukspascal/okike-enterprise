-- Migration: Add file_url column and configure Storage Bucket policies
-- Run this in your Supabase SQL Editor if you prefer manual migration.

-- 1. Add file_url column to project_inquiries table
ALTER TABLE public.project_inquiries 
ADD COLUMN IF NOT EXISTS file_url text;

-- 2. Create the 'media' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Drop existing policies to avoid collision errors
DROP POLICY IF EXISTS "Allow public SELECT on media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public INSERT on media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public UPDATE on media bucket" ON storage.objects;

-- 4. Recreate access policies
CREATE POLICY "Allow public SELECT on media bucket" ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');
CREATE POLICY "Allow public INSERT on media bucket" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'media');
CREATE POLICY "Allow public UPDATE on media bucket" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

-- 5. Notify PostgREST to reload the schema cache so the column is immediately queryable via REST
NOTIFY pgrst, 'reload schema';
