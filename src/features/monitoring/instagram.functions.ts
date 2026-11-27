import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { SavedInstagramSearch } from './data';

export const listInstagramSearches = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedInstagramSearch[]> => {
    const { data, error } = await context.supabase
      .from('instagram_searches')
      .select('id, action, params_json, response_json, http_status, credits_used, result_count, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error('Unable to load Instagram search history:', error.message);
      throw new Error('Riwayat Instagram belum dapat dimuat. Silakan coba lagi.');
    }
    return (data ?? []).map(row => ({
      id: row.id,
      platform: 'instagram',
      action: row.action === 'search_profile' ? 'search_profile' : 'search_post',
      params_json: row.params_json,
      response_json: row.response_json,
      http_status: row.http_status,
      credits_used: row.credits_used,
      result_count: row.result_count,
      created_at: row.created_at,
    }));
  });
