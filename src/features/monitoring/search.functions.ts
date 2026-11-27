import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { asRecord, buildSearchUrl, creditsUsed, getItems } from './data';

export const searchSocioAPI = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ platform: z.enum(['tiktok', 'instagram', 'facebook', 'youtube', 'threads', 'twitter', 'news', 'tv', 'radio']), action: z.enum(['search_post', 'search_profile']), params: z.record(z.string(), z.string().max(500)) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.platform === 'news' && data.action !== 'search_post') throw new Error('News hanya mendukung Search Articles.');
    if ((data.platform === 'tv' || data.platform === 'radio') && data.action !== 'search_post') throw new Error('TV dan Radio hanya mendukung Broadcast Search.');
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
      if (response.status === 200) {
        const { data: saved, error } = await context.supabase.from('monitoring_searches').insert({
          user_id: context.userId,
          platform: data.platform,
          action: data.action,
          params_json: data.params,
          response_json: JSON.parse(payloadJSON),
          http_status: response.status,
          credits_used: creditsUsed({ http_status: response.status, payload }),
          result_count: getItems(payload).length,
        }).select('id').single();
        if (error) {
          console.error('Unable to save monitoring search history:', error.message);
          sync_error = true;
        } else {
          synced_search_id = saved.id;
        }
      }
      return { http_status: response.status, outbound_ip, payloadJSON, synced_search_id, sync_error };
    } catch (cause) {
      const timedOut = cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError');
      console.error('SocioAPI upstream request failed:', cause instanceof Error ? { name: cause.name, message: cause.message } : 'Unknown error');
      return {
        http_status: timedOut ? 504 : 502,
        outbound_ip,
        payloadJSON: JSON.stringify({
          message: timedOut
            ? 'SocioAPI tidak merespons dalam 30 detik (timeout).'
            : 'Server tidak dapat menjangkau SocioAPI. Periksa DNS, TLS, jaringan, atau base URL.',
          code: timedOut ? 'SOCIOAPI_TIMEOUT' : 'SOCIOAPI_NETWORK_ERROR',
        }),
        synced_search_id: null,
        sync_error: false,
      };
    }
  });


/**
 * Checks DNS/TLS/HTTP reachability of the SocioAPI host only.
 * It deliberately sends no API key and does not call a billable API route.
 */
export const checkSocioAPIHost = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const keyConfigured = Boolean(process.env['SOCIOAPI_API_KEY']?.trim());
    const base = process.env['SOCIOAPI_BASE_URL'] || 'https://api.socioapi.com';
    let url: URL;
    try {
      url = new URL(base);
    } catch {
      return { reachable: false, key_configured: keyConfigured, host_status: null, outbound_ip: null, message: 'SOCIOAPI_BASE_URL tidak valid.' };
    }
    if (url.protocol !== 'https:') {
      return { reachable: false, key_configured: keyConfigured, host_status: null, outbound_ip: null, message: 'URL SocioAPI harus menggunakan HTTPS.' };
    }
    const { detectOutboundIP } = await import('./outbound.server');
    const outbound_ip = await detectOutboundIP();
    try {
      // Probe only the host root without Authorization. A 401/403/404 still
      // proves the host answered; it does not verify the API key or endpoint.
      const response = await fetch(url.origin, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      });
      return {
        reachable: response.status < 500,
        key_configured: keyConfigured,
        host_status: response.status,
        outbound_ip,
        message: response.status < 500
          ? 'Host SocioAPI dapat dijangkau. Kunci API dan endpoint belum diuji.'
          : `Host SocioAPI merespons HTTP ${response.status}.`,
      };
    } catch (cause) {
      const timedOut = cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError');
      return {
        reachable: false,
        key_configured: keyConfigured,
        host_status: null,
        outbound_ip,
        message: timedOut ? 'Pemeriksaan host timeout setelah 8 detik.' : 'Host SocioAPI tidak dapat dijangkau (DNS, TLS, atau jaringan).',
      };
    }
  });
