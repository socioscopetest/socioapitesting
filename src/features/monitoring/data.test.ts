import { describe, expect, it } from 'vitest';
import { display, metric, creditsUsed, dateWIB, buildSearchUrl, httpError, latencyDisplay } from './data';
describe('Strict monitoring rules', () => {
  it('preserves upstream latency units without adding duplicate ms', () => { expect(latencyDisplay('14.203 ms')).toBe('14.203 ms'); expect(latencyDisplay(14.203)).toBe('14.203 ms'); expect(latencyDisplay(null)).toBe('N/A'); });
  it('reads actual SocioAPI credit_used without rounding fractional charges', () => { expect(creditsUsed({ http_status: 200, payload: { data: [{}], billing: { credit_used: 0.1, remaining_credits: 2499.6 } } })).toBe(0.1); });
  it('displays null optional fields as N/A', () => { expect(display(null)).toBe('N/A'); });
  it('displays null metrics as N/A rather than zero', () => { expect(metric(null)).toBe('N/A'); expect(metric(0)).toBe('0'); });
  it('keeps engagement, views and reach separate', () => { const item = { engagement: 120, views: 340, reach: null }; expect([metric(item.engagement), metric(item.views), metric(item.reach)]).toEqual(['120', '340', 'N/A']); });
  it('uses zero credits for HTTP 200 empty results', () => { expect(creditsUsed({ http_status: 200, payload: { data: [], billing: { credits_used: 8 } } })).toBe(0); });
  it('formats published dates in WIB', () => { expect(dateWIB('2026-11-26T07:32:00Z')).toContain('14.32 WIB'); });
  it.each([400, 401, 402, 403])('provides a clear message for HTTP %i', status => { expect(httpError(status)).not.toContain('tidak tersedia'); });
  it('routes post search to selected platform', () => { expect(buildSearchUrl('https://api.socioapi.com', 'instagram', 'search_post', { keyword: 'kopi', page: '2' }).href).toBe('https://api.socioapi.com/api/v1/events/instagram/search?keyword=kopi&page=2'); });
  it('routes profile search with platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'tiktok', 'search_profile', { username: 'nadia' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=nadia&platform=tiktok'); });
});
