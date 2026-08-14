-- 1. Create scraped_issues table with location and feedback tracking
CREATE TABLE IF NOT EXISTS public.scraped_issues (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    source_url text NOT NULL UNIQUE,
    source_platform text NOT NULL,
    category text,
    market_value_score integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    solution_notes text,
    location_region text DEFAULT 'Global'::text NOT NULL,
    location_country text DEFAULT 'Global'::text NOT NULL,
    feedback_score integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create agent_learning_memory table (Neural Few-Shot Training Memory)
CREATE TABLE IF NOT EXISTS public.agent_learning_memory (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_category text NOT NULL,
    successful_blueprint_summary text NOT NULL,
    confidence_weight numeric DEFAULT 1.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.scraped_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_learning_memory ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Authenticated admins can perform any operation
DROP POLICY IF EXISTS "Admins manage scraped_issues" ON public.scraped_issues;
CREATE POLICY "Admins manage scraped_issues" ON public.scraped_issues
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage agent_learning_memory" ON public.agent_learning_memory;
CREATE POLICY "Admins manage agent_learning_memory" ON public.agent_learning_memory
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. Setup audit log triggers
DROP TRIGGER IF EXISTS audit_scraped_issues_trigger ON public.scraped_issues;
CREATE TRIGGER audit_scraped_issues_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.scraped_issues
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS set_scraped_issues_updated ON public.scraped_issues;
CREATE TRIGGER set_scraped_issues_updated
BEFORE UPDATE ON public.scraped_issues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Notify PostgREST cache reload
NOTIFY pgrst, 'reload schema';
