CREATE TABLE IF NOT EXISTS public.instagram_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('search_post', 'search_profile')),
  params_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  http_status INTEGER NOT NULL CHECK (http_status = 200),
  credits_used NUMERIC,
  result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instagram_searches_user_created_idx
  ON public.instagram_searches (user_id, created_at DESC);

ALTER TABLE public.instagram_searches ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.instagram_searches TO authenticated;
GRANT ALL ON public.instagram_searches TO service_role;

DROP POLICY IF EXISTS "Users can read their own Instagram searches" ON public.instagram_searches;
CREATE POLICY "Users can read their own Instagram searches"
  ON public.instagram_searches FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can save their own Instagram searches" ON public.instagram_searches;
CREATE POLICY "Users can save their own Instagram searches"
  ON public.instagram_searches FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
