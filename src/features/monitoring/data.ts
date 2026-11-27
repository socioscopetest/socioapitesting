export type Platform = 'tiktok' | 'instagram';
export type Action = 'search_post' | 'search_profile';
export type Item = Record<string, unknown>;
export interface ApiResult { http_status: number; outbound_ip?: string | null; payload: Item }
export interface SavedInstagramSearch {
  id: string;
  action: Action;
  params_json: string;
  response_json: string;
  http_status: number;
  credits_used: number | null;
  result_count: number;
  created_at: string;
}
export const shouldSyncInstagramResult = (platform: Platform, status: number): boolean => platform === 'instagram' && status === 200;
export const asRecord = (value: unknown): Item => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Item : {};
export const display = (value: unknown): string => value === null || value === undefined || value === '' ? 'N/A' : String(value);
export const metric = (value: unknown): string => typeof value === 'number' ? new Intl.NumberFormat('en-US', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value) : display(value);
export const numberValue = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export const latencyDisplay = (value: unknown): string => value === null || value === undefined ? 'N/A' : typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) ? `${value} ms` : display(value);
export const dateWIB = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date) + ' WIB';
};
export const getItems = (payload: Item): Item[] => Array.isArray(payload['data']) ? payload['data'].map(asRecord) : [];
export const creditsUsed = (result: ApiResult): number | null => {
  if (result.http_status === 200 && Array.isArray(result.payload['data']) && result.payload['data'].length === 0) return 0;
  const billing = asRecord(result.payload['billing']);
  return numberValue(billing['credit_used'] ?? billing['credits_used']);
};
export function profileMetricValues(item: Item, platform: Platform) {
  const stats = asRecord(item['metrics']);
  return {
    followers: item['followers'] ?? item['follower_count'] ?? stats['followers'] ?? stats['follower_count'],
    following: item['following'] ?? item['following_count'] ?? stats['following'] ?? stats['following_count'],
    likes: item['likes'] ?? item['favorites'] ?? item['favourites_count'] ?? stats['likes'] ?? stats['favourites_count'],
    posts: item[platform === 'tiktok' ? 'videos' : 'posts'] ?? item['event_count'] ?? stats[platform === 'tiktok' ? 'videos' : 'posts'] ?? stats['event_count'],
  };
}
export const httpError = (status: number): string => ({ 400: 'Parameter pencarian tidak valid. Periksa keyword, tanggal, dan halaman.', 401: 'Akses tidak terautentikasi. Periksa kunci SocioAPI atau masuk kembali.', 402: 'Kredit SocioAPI tidak mencukupi untuk pencarian ini.', 403: 'Akses ditolak. Akun Anda tidak memiliki izin untuk endpoint ini.', 429: 'Terlalu banyak permintaan. Silakan coba lagi sebentar lagi.', 503: 'Kunci SocioAPI belum dikonfigurasi.' }[status] ?? `Layanan SocioAPI tidak tersedia (HTTP ${status}). Coba kembali.`);
export const responseError = (result: ApiResult): string => {
  const message = result.http_status === 403 && typeof result.payload['message'] === 'string' && /IP Whitelist|IP .*not whitelisted/i.test(result.payload['message']) ? 'SocioAPI menolak akses: IP belum diizinkan. Periksa whitelist IP pada akun SocioAPI Anda sebelum menjalankan pencarian.' : httpError(result.http_status);
  return result.http_status === 403 ? `${message} Outbound IP: ${display(result.outbound_ip)}. IP ini terdeteksi oleh ipify dan dapat berbeda dari IP yang dilihat SocioAPI atau berubah setelah aplikasi dipublikasikan.` : message;
};
export function buildSearchUrl(base: string, platform: Platform, action: Action, params: Record<string, string>): URL {
  const url = new URL(action === 'search_post' ? `/api/v1/events/${platform}/search` : '/api/v1/senders/search', base);
  const allowed = action === 'search_post' ? ['keyword', 'start_date', 'end_date', 'sort_by', 'sort_order', 'page', 'cursor'] : ['username', 'name', 'page', 'size'];
  for (const key of allowed) { const value = params[key]; if (value?.trim()) url.searchParams.set(key, value.trim()); }
  if (action === 'search_profile') url.searchParams.set('platform', platform);
  return url;
}
export function previewResult(platform: Platform, action: Action): ApiResult {
  const posts: Item[] = [
    { author_name: 'Nadia Putri', author_username: 'nadiaputri', lang: 'id', published_at: '2026-11-26T07:32:00Z', original_id: '7441023896502189318', text: 'Weekend well spent! ☕ Menemukan hidden gem coffee shop di Jakarta. Tempatnya cozy banget, kopinya juga juara. Siapa yang udah pernah ke sini?', hashtags: ['coffeeshop', 'jakarta', 'hiddengem', 'kopilokal'], engagement: 14820, likes: 12500, comments: 320, shares: 2000, views: 185600, reach: null },
    { author_name: 'Rizky Pratama', author_username: 'rizkypratama', lang: 'id', published_at: '2026-11-26T06:15:00Z', original_id: '7441023678211548902', text: 'POV: kamu akhirnya nemu kopi yang pas sama selera kamu 🤌 Review jujur 3 coffee shop favorit di Jakarta. Nomor 3 wajib masuk list kalian!', hashtags: ['coffeeshop', 'coffeetok', 'jakarta', 'reviewkopi'], engagement: 8650, likes: 7200, comments: 450, shares: 1000, views: 92400, reach: null },
    { author_name: 'Kopi & Cerita', author_username: 'kopidancerita', lang: 'id', published_at: '2026-11-26T05:40:00Z', original_id: '7441012894592873021', text: 'Setiap cangkir punya cerita. Pagi ini, ceritanya tentang slow mornings dan aroma kopi yang baru diseduh. Selamat menikmati hari kalian. ☕', hashtags: ['coffeeshop', 'kopiindonesia', 'slowmorning'], engagement: 3240, likes: 2800, comments: 140, shares: 300, views: 38600, reach: null },
  ];
  const profiles = posts.map((p, index) => ({ fullname: p['author_name'], username: p['author_username'], bio: ['Coffee enthusiast · Jakarta ☕\nSharing places, one cup at a time.', 'Lifestyle, coffee & everyday stories.\nJakarta, Indonesia 🇮🇩', 'Kopi lokal. Cerita setiap hari. ☕'][index], verified: index === 1, followers: [248500, 186200, 32700][index], following: [482, 321, 128][index], likes: [3200000, 1800000, null][index], videos: [284, 196, 82][index], posts: [428, 315, 201][index], original_id: p['original_id'] }));
  return { http_status: 200, payload: { data: action === 'search_post' ? posts.map(p => ({ ...p, url: platform === 'tiktok' ? `https://www.tiktok.com/@${p['author_username']}/video/${p['original_id']}` : `https://www.instagram.com/${p['author_username']}/` })) : profiles, pagination: { total_items: 3, current_page: 1, page_size: 3, total_pages: 1, next_cursor: null }, billing: { remaining_credits: null, credits_used: 0 }, time: { value: null } } };
}
