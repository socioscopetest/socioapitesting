CREATE TABLE public.instagram_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('search_post', 'search_profile')),
  params_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  credits_used NUMERIC,
  result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.instagram_searches TO authenticated;
GRANT ALL ON public.instagram_searches TO service_role;

ALTER TABLE public.instagram_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own Instagram searches"
ON public.instagram_searches
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can save their own Instagram searches"
ON public.instagram_searches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX instagram_searches_user_created_idx
ON public.instagram_searches (user_id, created_at DESC);