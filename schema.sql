--
-- PostgreSQL database dump
--

\restrict TA8PFZ9EuFb4JjqU31s3iwHDFcwrDPslbbkdErYm9cNrWEh66QVd1ePUDrOY4nP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'client'
);


--
-- Name: milestone_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_status AS ENUM (
    'pending',
    'active',
    'done'
);


--
-- Name: project_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_stage AS ENUM (
    'submitted',
    'reviewing',
    'accepted',
    'declined',
    'in_progress',
    'completed'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
          NEW.raw_user_meta_data->>'avatar_url');
  IF lower(NEW.email) = 'okikeenterprises@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  END IF;
  RETURN NEW;
END $$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;


--
-- Name: seed_milestones(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_milestones() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.stage = 'in_progress' AND (OLD.stage IS DISTINCT FROM 'in_progress')
     AND NOT EXISTS (SELECT 1 FROM public.project_milestones WHERE project_id = NEW.id) THEN
    INSERT INTO public.project_milestones (project_id, name, position, status) VALUES
      (NEW.id,'Design',1,'active'),
      (NEW.id,'Build',2,'pending'),
      (NEW.id,'Review',3,'pending'),
      (NEW.id,'Launch',4,'pending');
  END IF;
  RETURN NEW;
END $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_user_id uuid,
    client_email text NOT NULL,
    inquiry_id uuid,
    title text NOT NULL,
    package_name text,
    total numeric,
    deposit numeric,
    currency text DEFAULT 'USD'::text NOT NULL,
    stage public.project_stage DEFAULT 'submitted'::public.project_stage NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    experience_level text NOT NULL,
    goals text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    tagline text,
    price numeric,
    currency text DEFAULT 'USD'::text NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    request_quote boolean DEFAULT false NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text,
    url text,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    url text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text,
    project_type text NOT NULL,
    budget text,
    timeline text,
    details text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    client_user_id uuid,
    status text DEFAULT 'new'::text NOT NULL,
    file_url text
);


--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    status public.milestone_status DEFAULT 'pending'::public.milestone_status NOT NULL,
    note text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    message text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text,
    bio text,
    image_url text,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text,
    excerpt text,
    content text,
    image_url text,
    author text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text,
    track text,
    description text,
    duration text,
    image_url text,
    instructor text,
    lessons jsonb DEFAULT '[]'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: addons addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_pkey PRIMARY KEY (id);


--
-- Name: client_projects client_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_projects
    ADD CONSTRAINT client_projects_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: packages packages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_slug_key UNIQUE (slug);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: project_inquiries project_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_inquiries
    ADD CONSTRAINT project_inquiries_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_updates project_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_updates
    ADD CONSTRAINT project_updates_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: client_projects seed_milestones_on_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER seed_milestones_on_progress AFTER UPDATE ON public.client_projects FOR EACH ROW EXECUTE FUNCTION public.seed_milestones();


--
-- Name: addons set_addons_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_addons_updated BEFORE UPDATE ON public.addons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: client_projects set_client_projects_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_client_projects_updated BEFORE UPDATE ON public.client_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: project_milestones set_milestones_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_milestones_updated BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: packages set_packages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_packages_updated BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: partners set_partners_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_partners_updated BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: portfolio_items set_portfolio_items_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_portfolio_items_updated BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles set_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: services set_services_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: team_members set_team_members_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_team_members_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: blog_posts set_blog_posts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_blog_posts_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: courses set_courses_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: client_projects client_projects_client_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_projects
    ADD CONSTRAINT client_projects_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: client_projects client_projects_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_projects
    ADD CONSTRAINT client_projects_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.project_inquiries(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_inquiries project_inquiries_client_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_inquiries
    ADD CONSTRAINT project_inquiries_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;


--
-- Name: project_updates project_updates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_updates
    ADD CONSTRAINT project_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: project_updates project_updates_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_updates
    ADD CONSTRAINT project_updates_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles Admin views all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin views all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins delete contact; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete contact" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_enrollments Admins delete enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete enrollments" ON public.course_enrollments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_inquiries Admins delete inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete inquiries" ON public.project_inquiries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addons Admins manage addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage addons" ON public.addons TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_milestones Admins manage milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage milestones" ON public.project_milestones TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: packages Admins manage packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage packages" ON public.packages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins manage partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage partners" ON public.partners TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: portfolio_items Admins manage portfolio_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage portfolio_items" ON public.portfolio_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_projects Admins manage projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage projects" ON public.client_projects TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: services Admins manage services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage services" ON public.services TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_settings Admins manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage settings" ON public.site_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins manage team_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage team_members" ON public.team_members TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins manage blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage blog posts" ON public.blog_posts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins manage courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage courses" ON public.courses TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_updates Admins manage updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage updates" ON public.project_updates TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: addons Admins read all addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all addons" ON public.addons FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_inquiries Admins read all inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all inquiries" ON public.project_inquiries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: packages Admins read all packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all packages" ON public.packages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins read all partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all partners" ON public.partners FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: portfolio_items Admins read all portfolio_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all portfolio_items" ON public.portfolio_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_projects Admins read all projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all projects" ON public.client_projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: services Admins read all services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all services" ON public.services FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins read all team_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all team_members" ON public.team_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blog_posts Admins read all blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all blog posts" ON public.blog_posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins read all courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all courses" ON public.courses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins read contact; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read contact" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_enrollments Admins read enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read enrollments" ON public.course_enrollments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins see all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins see all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_inquiries Admins update inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update inquiries" ON public.project_inquiries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Anyone can submit contact messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);


--
-- Name: course_enrollments Anyone can submit course enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit course enrollments" ON public.course_enrollments FOR INSERT WITH CHECK (true);


--
-- Name: project_inquiries Anyone can submit project inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit project inquiries" ON public.project_inquiries FOR INSERT WITH CHECK (true);


--
-- Name: site_settings Anyone reads settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: project_milestones Client reads own milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client reads own milestones" ON public.project_milestones FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.client_projects p
  WHERE ((p.id = project_milestones.project_id) AND ((p.client_user_id = auth.uid()) OR (p.client_email = (auth.jwt() ->> 'email'::text)))))));


--
-- Name: client_projects Client reads own projects (email); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client reads own projects (email)" ON public.client_projects FOR SELECT TO authenticated USING ((client_email = (auth.jwt() ->> 'email'::text)));


--
-- Name: client_projects Client reads own projects (uid); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client reads own projects (uid)" ON public.client_projects FOR SELECT TO authenticated USING ((auth.uid() = client_user_id));


--
-- Name: project_updates Client reads own updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client reads own updates" ON public.project_updates FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.client_projects p
  WHERE ((p.id = project_updates.project_id) AND ((p.client_user_id = auth.uid()) OR (p.client_email = (auth.jwt() ->> 'email'::text)))))));


--
-- Name: project_inquiries Owner reads own inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner reads own inquiries" ON public.project_inquiries FOR SELECT TO authenticated USING ((auth.uid() = client_user_id));


--
-- Name: client_projects Users can create own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own projects" ON public.client_projects FOR INSERT TO authenticated WITH CHECK ((auth.uid() = client_user_id));


--
-- Name: project_inquiries Users can create own inquiries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own inquiries" ON public.project_inquiries FOR INSERT TO authenticated WITH CHECK ((auth.uid() = client_user_id));


--
-- Name: addons Public reads published addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published addons" ON public.addons FOR SELECT USING ((published = true));


--
-- Name: packages Public reads published packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published packages" ON public.packages FOR SELECT USING ((published = true));


--
-- Name: partners Public reads published partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published partners" ON public.partners FOR SELECT USING ((published = true));


--
-- Name: portfolio_items Public reads published portfolio_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published portfolio_items" ON public.portfolio_items FOR SELECT USING ((published = true));


--
-- Name: services Public reads published services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published services" ON public.services FOR SELECT USING ((published = true));


--
-- Name: team_members Public reads published team_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published team_members" ON public.team_members FOR SELECT USING ((published = true));


--
-- Name: blog_posts Public reads published blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published blog posts" ON public.blog_posts FOR SELECT USING ((published = true));


--
-- Name: courses Public reads published courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public reads published courses" ON public.courses FOR SELECT USING ((published = true));


--
-- Name: user_roles Users see own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

--
-- Name: client_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: course_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

--
-- Name: partners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_inquiries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_inquiries ENABLE ROW LEVEL SECURITY;

--
-- Name: project_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: project_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;


--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;


--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO sandbox_exec;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO sandbox_exec;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO sandbox_exec;


--
-- Name: FUNCTION seed_milestones(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.seed_milestones() TO anon;
GRANT ALL ON FUNCTION public.seed_milestones() TO authenticated;
GRANT ALL ON FUNCTION public.seed_milestones() TO service_role;
GRANT ALL ON FUNCTION public.seed_milestones() TO sandbox_exec;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.set_updated_at() TO sandbox_exec;


--
-- Name: TABLE addons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.addons TO anon;
GRANT ALL ON TABLE public.addons TO authenticated;
GRANT ALL ON TABLE public.addons TO service_role;
GRANT SELECT,INSERT ON TABLE public.addons TO sandbox_exec;


--
-- Name: TABLE client_projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_projects TO anon;
GRANT ALL ON TABLE public.client_projects TO authenticated;
GRANT ALL ON TABLE public.client_projects TO service_role;
GRANT SELECT,INSERT ON TABLE public.client_projects TO sandbox_exec;


--
-- Name: TABLE contact_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contact_messages TO anon;
GRANT ALL ON TABLE public.contact_messages TO authenticated;
GRANT ALL ON TABLE public.contact_messages TO service_role;
GRANT SELECT,INSERT ON TABLE public.contact_messages TO sandbox_exec;


--
-- Name: TABLE course_enrollments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.course_enrollments TO anon;
GRANT ALL ON TABLE public.course_enrollments TO authenticated;
GRANT ALL ON TABLE public.course_enrollments TO service_role;
GRANT SELECT,INSERT ON TABLE public.course_enrollments TO sandbox_exec;


--
-- Name: TABLE packages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.packages TO anon;
GRANT ALL ON TABLE public.packages TO authenticated;
GRANT ALL ON TABLE public.packages TO service_role;
GRANT SELECT,INSERT ON TABLE public.packages TO sandbox_exec;


--
-- Name: TABLE partners; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.partners TO anon;
GRANT ALL ON TABLE public.partners TO authenticated;
GRANT ALL ON TABLE public.partners TO service_role;
GRANT SELECT,INSERT ON TABLE public.partners TO sandbox_exec;


--
-- Name: TABLE portfolio_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.portfolio_items TO anon;
GRANT ALL ON TABLE public.portfolio_items TO authenticated;
GRANT ALL ON TABLE public.portfolio_items TO service_role;
GRANT SELECT,INSERT ON TABLE public.portfolio_items TO sandbox_exec;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT ON TABLE public.profiles TO sandbox_exec;


--
-- Name: TABLE project_inquiries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_inquiries TO anon;
GRANT ALL ON TABLE public.project_inquiries TO authenticated;
GRANT ALL ON TABLE public.project_inquiries TO service_role;
GRANT SELECT,INSERT ON TABLE public.project_inquiries TO sandbox_exec;


--
-- Name: TABLE project_milestones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_milestones TO anon;
GRANT ALL ON TABLE public.project_milestones TO authenticated;
GRANT ALL ON TABLE public.project_milestones TO service_role;
GRANT SELECT,INSERT ON TABLE public.project_milestones TO sandbox_exec;


--
-- Name: TABLE project_updates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_updates TO anon;
GRANT ALL ON TABLE public.project_updates TO authenticated;
GRANT ALL ON TABLE public.project_updates TO service_role;
GRANT SELECT,INSERT ON TABLE public.project_updates TO sandbox_exec;


--
-- Name: TABLE services; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.services TO anon;
GRANT ALL ON TABLE public.services TO authenticated;
GRANT ALL ON TABLE public.services TO service_role;
GRANT SELECT,INSERT ON TABLE public.services TO sandbox_exec;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_settings TO anon;
GRANT ALL ON TABLE public.site_settings TO authenticated;
GRANT ALL ON TABLE public.site_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.site_settings TO sandbox_exec;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.team_members TO anon;
GRANT ALL ON TABLE public.team_members TO authenticated;
GRANT ALL ON TABLE public.team_members TO service_role;
GRANT SELECT,INSERT ON TABLE public.team_members TO sandbox_exec;


--
-- Name: TABLE blog_posts; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.blog_posts TO anon;
GRANT ALL ON TABLE public.blog_posts TO authenticated;
GRANT ALL ON TABLE public.blog_posts TO service_role;
GRANT SELECT,INSERT ON TABLE public.blog_posts TO sandbox_exec;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;
GRANT SELECT,INSERT ON TABLE public.courses TO sandbox_exec;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_roles TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict TA8PFZ9EuFb4JjqU31s3iwHDFcwrDPslbbkdErYm9cNrWEh66QVd1ePUDrOY4nP

