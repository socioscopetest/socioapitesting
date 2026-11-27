import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL as PUBLIC_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY as PUBLIC_SUPABASE_KEY } from './config';

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if ((supabaseKey.startsWith('sb_publishable_') || supabaseKey.startsWith('sb_secret_')) && headers.get('Authorization') === `Bearer ${supabaseKey}`) headers.delete('Authorization');
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const SUPABASE_URL = process.env['SUPABASE_URL'] || PUBLIC_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || PUBLIC_SUPABASE_KEY;
  const request = getRequest();
  if (!request?.headers) throw new Error('Unauthorized: No request headers available');
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized: No authorization header provided');
  const token = authHeader.slice('Bearer '.length);
  if (!token || token.split('.').length !== 3) throw new Error('Unauthorized: Invalid token');
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY), headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) throw new Error('Unauthorized: Invalid token');
  if (!data.claims.sub) throw new Error('Unauthorized: No user ID found in token');
  return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } });
});
