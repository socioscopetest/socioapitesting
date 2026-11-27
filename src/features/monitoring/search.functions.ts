import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { asRecord, buildSearchUrl, creditsUsed, getItems, shouldSyncInstagramResult } from './data';

export const searchSocioAPI = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ platform: z.enum(['tiktok', 'instagram', 'facebook', 'youtube', 'threads', 'twitter', 'news']), action: z.enum(['search_post', 'search_profile']), params: z.record(z.string(), z.string().max(500)) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.platform === 'news' && data.action !== 'search_post') throw new Error('News hanya mendukung Search Articles.');
    const { detectOutboundIP } = await import('./outbound.server');
    const outbound_ip = await detectOutboundIP();
    const key = process.env['SOCIOAPI_API_KEY'];
    if (!key) return { http_status: 503, outbound_ip, payloadJSON: JSON.stringify({ message: 'SocioAPI belum dikonfigurasi.' }), synced_search_id: null, sync_error: false };
    const url = buildSearchUrl(process.env['SOCIOAPI_BASE_URL'] || 'https://api.socioapi.com', data.platform, data.action, data.params);
    if (url.protocol !== 'https:') throw new Error('SocioAPI memerlukan HTTPS.');
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, signal: AbortSignal.timeout(30000), redirect: 'manual' });
      const payload = asRecord(await response.json().catch(() => ({ message: 'Respons SocioAPI bukan JSON.' })));
      const payloadJSON = JSON.stringify(payload);
      let synced_search_id: string | null = null;
      let sync_error = false;
      if (shouldSyncInstagramResult(data.platform, response.status)) {
        const { data: saved, error } = await context.supabase.from('instagram_searches').insert({
          user_id: context.userId,
          action: data.action,
          params_json: JSON.stringify(data.params),
          response_json: payloadJSON,
          http_status: response.status,
          credits_used: creditsUsed({ http_status: response.status, payload }),
          result_count: getItems(payload).length,
        }).select('id').single();
        if (error) {
          console.error('Unable to save Instagram search history:', error.message);
          sync_error = true;
        } else {
          synced_search_id = saved.id;
        }
      }
      return { http_status: response.status, outbound_ip, payloadJSON, synced_search_id, sync_error };
    } catch {
      return { http_status: 502, outbound_ip, payloadJSON: JSON.stringify({ message: 'SocioAPI tidak dapat dihubungi. Silakan coba lagi.' }), synced_search_id: null, sync_error: false };
    }
  });
