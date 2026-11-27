import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { asRecord, buildSearchUrl } from './data';

export const searchSocioAPI = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ platform: z.enum(['tiktok', 'instagram']), action: z.enum(['search_post', 'search_profile']), params: z.record(z.string(), z.string().max(500)) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env['SOCIOAPI_API_KEY'];
    if (!key) return { http_status: 503, payloadJSON: JSON.stringify({ message: 'SocioAPI belum dikonfigurasi.' }) };
    const url = buildSearchUrl(process.env['SOCIOAPI_BASE_URL'] || 'https://api.socioapi.com', data.platform, data.action, data.params);
    if (url.protocol !== 'https:') throw new Error('SocioAPI memerlukan HTTPS.');
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, signal: AbortSignal.timeout(30000), redirect: 'manual' });
      const payload = asRecord(await response.json().catch(() => ({ message: 'Respons SocioAPI bukan JSON.' })));
      return { http_status: response.status, payloadJSON: JSON.stringify(payload) };
    } catch {
      return { http_status: 502, payloadJSON: JSON.stringify({ message: 'SocioAPI tidak dapat dihubungi. Silakan coba lagi.' }) };
    }
  });
