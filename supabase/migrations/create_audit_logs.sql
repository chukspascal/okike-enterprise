-- Migration: Create audit_logs table and log triggers
-- Run this in your Supabase SQL Editor if you prefer manual migration.

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    user_email text,
    action text NOT NULL,
    table_name text NOT NULL,
    row_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Enable RLS and setup read-only policy
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs 
FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Define the logger trigger function
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
    current_user_email text;
    old_row jsonb := null;
    new_row jsonb := null;
    row_id_val text := null;
BEGIN
    -- Try to capture Supabase auth JWT claims
    BEGIN
        current_user_id := auth.uid();
        current_user_email := auth.jwt() ->> 'email';
    EXCEPTION WHEN OTHERS THEN
        current_user_id := null;
        current_user_email := null;
    END;

    IF (TG_OP = 'DELETE') THEN
        old_row := to_jsonb(OLD);
        row_id_val := COALESCE(old_row ->> 'id', old_row ->> 'key');
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, row_id, old_data, new_data)
        VALUES (current_user_id, current_user_email, 'DELETE', TG_TABLE_NAME, row_id_val, old_row, null);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);
        row_id_val := COALESCE(new_row ->> 'id', new_row ->> 'key');
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, row_id, old_data, new_data)
        VALUES (current_user_id, current_user_email, 'UPDATE', TG_TABLE_NAME, row_id_val, old_row, new_row);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_row := to_jsonb(NEW);
        row_id_val := COALESCE(new_row ->> 'id', new_row ->> 'key');
        INSERT INTO public.audit_logs (user_id, user_email, action, table_name, row_id, old_data, new_data)
        VALUES (current_user_id, current_user_email, 'INSERT', TG_TABLE_NAME, row_id_val, null, new_row);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Setup triggers
-- client_projects
DROP TRIGGER IF EXISTS audit_client_projects_trigger ON public.client_projects;
CREATE TRIGGER audit_client_projects_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.client_projects
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- project_inquiries
DROP TRIGGER IF EXISTS audit_project_inquiries_trigger ON public.project_inquiries;
CREATE TRIGGER audit_project_inquiries_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.project_inquiries
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- team_members
DROP TRIGGER IF EXISTS audit_team_members_trigger ON public.team_members;
CREATE TRIGGER audit_team_members_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- site_settings
DROP TRIGGER IF EXISTS audit_site_settings_trigger ON public.site_settings;
CREATE TRIGGER audit_site_settings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- blog_posts
DROP TRIGGER IF EXISTS audit_blog_posts_trigger ON public.blog_posts;
CREATE TRIGGER audit_blog_posts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- courses
DROP TRIGGER IF EXISTS audit_courses_trigger ON public.courses;
CREATE TRIGGER audit_courses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- Notify PostgREST cache reload
NOTIFY pgrst, 'reload schema';
