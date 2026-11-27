# SocioScope System Setup

## Stack
- TanStack Start + React + TypeScript frontend and server functions
- Supabase Auth + PostgreSQL (RLS) for account-scoped search history
- SocioAPI called only from server functions; never expose SOCIOAPI_API_KEY to browser code
- Vercel deployment from the GitHub main branch

## Environment variables
Set these in Vercel Project Settings → Environment Variables (Production, Preview, Development as needed):
- SOCIOAPI_API_KEY: private SocioAPI bearer token (server only)
- SOCIOAPI_BASE_URL: https://api.socioapi.com
- SUPABASE_URL: https://hisknlpxgfglrhkcjxhv.supabase.co
- SUPABASE_PUBLISHABLE_KEY: Supabase publishable key
- VITE_SUPABASE_URL: same Supabase URL
- VITE_SUPABASE_PUBLISHABLE_KEY: same publishable key

Do not use VITE_ for SocioAPI secrets. Never add service_role or Supabase secret keys to frontend variables.

## Database
The active Supabase project is configured in supabase/config.toml. Migrations are stored under supabase/migrations. The monitoring_searches table stores successful HTTP 200 search results for all supported platforms, per user. RLS policies restrict reads and inserts to auth.uid() = user_id.

## API routing
- Social Search Post: /api/v1/events/{platform}/search
- Search Profile: /api/v1/senders/search?platform={platform}
- News Search Articles: /api/v1/events/news/search
- TV and Radio Broadcast: /api/v1/transcribe/search with source_type=tv|radio

## Deploy
1. Configure all environment variables in Vercel.
2. Confirm the SocioAPI key is valid and its outbound IP is allowed by SocioAPI if IP whitelisting is enabled.
3. Connect the GitHub repository and deploy branch main.
4. Redeploy after changing environment variables.
5. Test sign-in, one Search Post, one Search Profile, TV and Radio search, and Saved searches.
