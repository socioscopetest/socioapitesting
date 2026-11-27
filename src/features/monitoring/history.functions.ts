import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { SavedInstagramSearch } from './data';

export const listMonitoringSearches = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedInstagramSearch[]> => {
    const { data, error } = await context.supabase
      .from('monitoring_searches')
      .select('id, platform, action, params_json, response_json, http_status, credits_used, result_count, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Unable to load monitoring search history:', error.message);
      throw new Error('Riwayat pencarian belum dapat dimuat. Silakan coba lagi.');
    }
    return (data ?? []).map(row => ({
      id: row.id,
      platform: row.platform as SavedInstagramSearch['platform'],
      action: row.action === 'search_profile' ? 'search_profile' : 'search_post',
      params_json: JSON.stringify(row.params_json),
      response_json: JSON.stringify(row.response_json),
      http_status: row.http_status,
      credits_used: row.credits_used,
      result_count: row.result_count,
      created_at: row.created_at,
    }));
  });
