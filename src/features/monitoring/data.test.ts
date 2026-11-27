import { describe, expect, it } from 'vitest';
import { display, metric, creditsUsed, dateWIB, buildSearchUrl, httpError, latencyDisplay, shouldSyncInstagramResult, profileMetricValues, emptyResultsMessage, previewResult, getItems, asRecord } from './data';
describe('Strict monitoring rules', () => {
  it('preserves upstream latency units without adding duplicate ms', () => { expect(latencyDisplay('14.203 ms')).toBe('14.203 ms'); expect(latencyDisplay(14.203)).toBe('14.203 ms'); expect(latencyDisplay(null)).toBe('N/A'); });
  it('reads actual SocioAPI credit_used without rounding fractional charges', () => { expect(creditsUsed({ http_status: 200, payload: { data: [{}], billing: { credit_used: 0.1, remaining_credits: 2499.6 } } })).toBe(0.1); });
  it('displays null optional fields as N/A', () => { expect(display(null)).toBe('N/A'); });
  it('displays null metrics as N/A rather than zero', () => { expect(metric(null)).toBe('N/A'); expect(metric(0)).toBe('0'); });
  it('keeps engagement, views and reach separate', () => { const item = { engagement: 120, views: 340, reach: null }; expect([metric(item.engagement), metric(item.views), metric(item.reach)]).toEqual(['120', '340', 'N/A']); });
  it('uses explicit credit usage even when HTTP 200 returns no data', () => {
    expect(creditsUsed({ http_status: 200, payload: { data: [], billing: { credit_used: 0 } } })).toBe(0);
    expect(creditsUsed({ http_status: 200, payload: { data: [], billing: { remaining_credits: 2495.3 } } })).toBeNull();
  });
  it('uses the upstream no-results message when provided', () => {
    expect(emptyResultsMessage({ message: 'Data tidak ditemukan' })).toBe('Data tidak ditemukan');
    expect(emptyResultsMessage({ data: [] })).toBe('Tidak ada data yang dikembalikan oleh SocioAPI.');
  });
  it('formats published dates in WIB', () => { expect(dateWIB('2026-11-26T07:32:00Z')).toContain('14.32 WIB'); });
  it.each([400, 401, 402, 403])('provides a clear message for HTTP %i', status => { expect(httpError(status)).not.toContain('tidak tersedia'); });
  it('maps actual SocioAPI Instagram profile counts to card metrics', () => { expect(profileMetricValues({ follower_count: 686600509, following_count: 307, favourites_count: 0, event_count: 8617 }, 'instagram')).toEqual({ followers: 686600509, following: 307, likes: 0, posts: 8617 }); });
  it('saves successful Instagram results for account sync', () => { expect(shouldSyncInstagramResult('instagram', 200)).toBe(true); });
  it('does not save failed Instagram responses as successful history', () => { expect(shouldSyncInstagramResult('instagram', 403)).toBe(false); });
  it('does not change TikTok storage behavior during Instagram setup', () => { expect(shouldSyncInstagramResult('tiktok', 200)).toBe(false); });
  it('routes TV and Radio Broadcast Search through the transcription endpoint with their source types', () => {
    expect(buildSearchUrl('https://api.socioapi.com', 'tv', 'search_post', { keyword: 'politik', source_name: 'kompas_tv', source_type: 'tv', start_date: '2026-03-01', end_date: '2026-03-06', page: '1', size: '10', sort_by: 'time_start', sort_order: 'desc', status: 'transcribed' }).href).toBe('https://api.socioapi.com/api/v1/transcribe/search?keyword=politik&source_name=kompas_tv&source_type=tv&start_date=2026-03-01&end_date=2026-03-06&page=1&size=10&sort_by=time_start&sort_order=desc&status=transcribed');
    expect(buildSearchUrl('https://api.socioapi.com', 'radio', 'search_post', { keyword: 'politik', source_name: 'trijaya_104.6_fm', start_date: '2026-11-26', end_date: '2026-11-26', page: '1', size: '10', sort_by: 'time_start', sort_order: 'desc', status: 'transcribed' }).searchParams.get('source_type')).toBe('radio');
  });
  it('previews broadcast transcription fields and pagination without fabricated media URLs', () => {
    const item = getItems(previewResult('radio', 'search_post').payload)[0]!;
    expect(item['source_type']).toBe('radio'); expect(item['source_name']).toBe('trijaya_104.6_fm');
    expect(item['file_path']).toBe(''); expect(item['text_segments']).toContain('00:00:00');
    expect(asRecord(asRecord(previewResult('tv', 'search_post').payload)['pagination'])['current_page']).toBe(1);
  });
  it('routes post search to selected platform', () => { expect(buildSearchUrl('https://api.socioapi.com', 'instagram', 'search_post', { keyword: 'kopi', page: '2' }).href).toBe('https://api.socioapi.com/api/v1/events/instagram/search?keyword=kopi&page=2'); });
  it('routes profile search with platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'tiktok', 'search_profile', { username: 'nadia' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=nadia&platform=tiktok'); });

  it('routes News Search Articles to the news events endpoint', () => { expect(buildSearchUrl('https://api.socioapi.com', 'news', 'search_post', { keyword: 'ekonomi', start_date: '2026-11-01', end_date: '2026-11-27', sort_by: 'time', sort_order: 'desc', page: '2' }).href).toBe('https://api.socioapi.com/api/v1/events/news/search?keyword=ekonomi&start_date=2026-11-01&end_date=2026-11-27&sort_by=time&sort_order=desc&page=2'); });
  it('provides News article preview fields and pagination', () => { const preview = previewResult('news', 'search_post'); const item = getItems(preview.payload)[0]!; expect(item['platform']).toBe('news'); expect(item['title']).toContain('APBD Kepri'); expect(item['url']).toContain('seputarkepri.co.id'); expect(asRecord(item['domain'])['domain_name']).toBe('seputarkepri.co.id'); expect(asRecord(preview.payload['pagination'])['total_items']).toBe(231); });
  it('routes X/Twitter Search Post to the Twitter events endpoint', () => { expect(buildSearchUrl('https://api.socioapi.com', 'twitter', 'search_post', { keyword: 'trending', page: '1' }).href).toBe('https://api.socioapi.com/api/v1/events/twitter/search?keyword=trending&page=1'); });
  it('routes X/Twitter Search Profile to the senders endpoint with the Twitter platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'twitter', 'search_profile', { username: 'socioapi', page: '1', size: '10' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=socioapi&page=1&size=10&platform=twitter'); });
  it('maps Twitter profile counts, verification, and profile identity fields', () => { const item = getItems(previewResult('twitter', 'search_profile').payload)[0]!; expect(item['username']).toBe('socioapi'); expect(item['url']).toBe('https://x.com/socioapi'); expect(profileMetricValues({ follower_count: 100, following_count: 20, event_count: 50 }, 'twitter')).toEqual({ followers: 100, following: 20, likes: undefined, posts: 50 }); });
  it('routes Threads Search Post with event_type, dates, sort and cursor parameters', () => { expect(buildSearchUrl('https://api.socioapi.com', 'threads', 'search_post', { keyword: 'trending', event_type: 'post', start_date: '2026-03-01', end_date: '2026-03-06', page: '1', sort_by: 'time', sort_order: 'desc', cursor: 'sample' }).href).toBe('https://api.socioapi.com/api/v1/events/threads/search?keyword=trending&event_type=post&start_date=2026-03-01&end_date=2026-03-06&sort_by=time&sort_order=desc&page=1&cursor=sample'); });
  it('uses Threads Search Post response fields including post text, author, timestamps and engagement metrics', () => { const item = getItems(previewResult('threads', 'search_post').payload)[0]!; expect(item['post']).toContain('UPDATE'); expect(item['sender_username']).toBe('hakahaki_id'); expect(item['publish_date']).toBe(1792414533); expect(item['like_count']).toBe(75); expect(item['impression']).toBe(14771); });
  it('routes Threads Search Profile to the senders endpoint with the Threads platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'threads', 'search_profile', { username: 'nasdem.50kota', page: '1', size: '10' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=nasdem.50kota&page=1&size=10&platform=threads'); });
  it('maps the actual Threads profile response fields and leaves unavailable metrics empty', () => { const item = getItems(previewResult('threads', 'search_profile').payload)[0]!; expect(item['name']).toBe('Nasdem 50 kota Official'); expect(item['username']).toBe('nasdem.50kota'); expect(item['platform']).toBe('threads'); expect(item['location']).toBeNull(); expect(profileMetricValues(item, 'threads')).toEqual({ followers: undefined, following: undefined, likes: undefined, posts: undefined }); });
  it('routes YouTube Search Profile to the senders endpoint with the YouTube platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'youtube', 'search_profile', { username: 'officialNasDem', page: '2', size: '10' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=officialNasDem&page=2&size=10&platform=youtube'); });
  it('keeps the YouTube no-results response and its pagination metadata', () => { const preview = previewResult('youtube', 'search_profile'); expect(preview.http_status).toBe(200); expect(getItems(preview.payload)).toEqual([]); expect(emptyResultsMessage(preview.payload)).toBe('Data tidak ditemukan'); expect(asRecord(preview.payload['pagination'])['current_page']).toBe(2); });
  it('routes YouTube Search Post to the YouTube events endpoint', () => { expect(buildSearchUrl('https://api.socioapi.com', 'youtube', 'search_post', { keyword: 'nasdem', page: '2' }).href).toBe('https://api.socioapi.com/api/v1/events/youtube/search?keyword=nasdem&page=2'); });
  it('routes Facebook Search Post to the Facebook events endpoint', () => { expect(buildSearchUrl('https://api.socioapi.com', 'facebook', 'search_post', { keyword: 'nasdem', page: '1' }).href).toBe('https://api.socioapi.com/api/v1/events/facebook/search?keyword=nasdem&page=1'); });
  it('routes Facebook Search Profile to the senders endpoint with the Facebook platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'facebook', 'search_profile', { username: 'fraksinasdem', page: '1', size: '10' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=fraksinasdem&page=1&size=10&platform=facebook'); });
  it('maps Facebook profile counts and post metrics from the actual response fields', () => { expect(profileMetricValues({ follower_count: 1200, following_count: 85, event_count: 420 }, 'facebook')).toEqual({ followers: 1200, following: 85, likes: undefined, posts: 420 }); });
  it('routes Instagram Search Post to the Instagram events endpoint', () => { expect(buildSearchUrl('https://api.socioapi.com', 'instagram', 'search_post', { keyword: 'kopi', start_date: '2026-11-01', end_date: '2026-11-27', sort_by: 'time', sort_order: 'desc', page: '2', cursor: '' }).href).toBe('https://api.socioapi.com/api/v1/events/instagram/search?keyword=kopi&start_date=2026-11-01&end_date=2026-11-27&sort_by=time&sort_order=desc&page=2'); });
  it('routes Instagram Search Profile to the senders endpoint with the Instagram platform filter', () => { expect(buildSearchUrl('https://api.socioapi.com', 'instagram', 'search_profile', { username: 'nadiaputri', name: '', page: '1', size: '10' }).href).toBe('https://api.socioapi.com/api/v1/senders/search?username=nadiaputri&page=1&size=10&platform=instagram'); });
});


describe('All nine SocioAPI platform request contracts', () => {
  it.each([
    ['tiktok', 'search_post', '/api/v1/events/tiktok/search?keyword=politik&page=1'],
    ['instagram', 'search_post', '/api/v1/events/instagram/search?keyword=politik&page=1'],
    ['facebook', 'search_post', '/api/v1/events/facebook/search?keyword=politik&page=1'],
    ['youtube', 'search_post', '/api/v1/events/youtube/search?keyword=politik&page=1'],
    ['threads', 'search_post', '/api/v1/events/threads/search?keyword=politik&event_type=post&page=1'],
    ['twitter', 'search_post', '/api/v1/events/twitter/search?keyword=politik&page=1'],
    ['news', 'search_post', '/api/v1/events/news/search?keyword=politik&page=1'],
    ['tv', 'search_post', '/api/v1/transcribe/search?keyword=politik&source_type=tv&page=1'],
    ['radio', 'search_post', '/api/v1/transcribe/search?keyword=politik&source_type=radio&page=1'],
  ] as const)('%s %s uses the expected endpoint and query', (platform, action, expected) => {
    const params = platform === 'threads'
      ? { keyword: 'politik', event_type: 'post', page: '1' }
      : { keyword: 'politik', page: '1' };
    const url = buildSearchUrl('https://api.socioapi.com', platform, action, params);
    expect(url.pathname + url.search).toBe(expected);
    expect(url.protocol).toBe('https:');
  });

  it.each([
    ['tiktok', 'tiktok'],
    ['instagram', 'instagram'],
    ['facebook', 'facebook'],
    ['youtube', 'youtube'],
    ['threads', 'threads'],
    ['twitter', 'twitter'],
  ] as const)('%s profile search is scoped to its platform', (platform, expectedPlatform) => {
    const url = buildSearchUrl('https://api.socioapi.com', platform, 'search_profile', { username: 'socioapi', page: '1', size: '10' });
    expect(url.pathname).toBe('/api/v1/senders/search');
    expect(url.searchParams.get('platform')).toBe(expectedPlatform);
    expect(url.searchParams.get('username')).toBe('socioapi');
  });

  it('does not invent credit usage when SocioAPI only returns remaining balance', () => {
    expect(creditsUsed({ http_status: 200, payload: { billing: { remaining_credits: 2493.1 } } })).toBeNull();
  });

  it('keeps News, TV, and Radio in Search Post mode only', () => {
    for (const platform of ['news', 'tv', 'radio'] as const) {
      expect(previewResult(platform, 'search_post').http_status).toBe(200);
    }
  });
});
