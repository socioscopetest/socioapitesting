export type Platform = 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'twitter' | 'news' | 'tv' | 'radio';
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
  const billing = asRecord(result.payload['billing']);
  // Trust an explicit upstream charge, including 0. Empty data alone does not mean free:
  // Search Profile may consume credits while returning no profiles.
  return numberValue(billing['credit_used'] ?? billing['credits_used']);
};
export const emptyResultsMessage = (payload: Item): string => {
  const message = payload['message'];
  return typeof message === 'string' && message.trim() ? message : 'Tidak ada data yang dikembalikan oleh SocioAPI.';
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
  const broadcast = platform === 'tv' || platform === 'radio';
  const url = new URL(broadcast ? '/api/v1/transcribe/search' : action === 'search_post' ? `/api/v1/events/${platform}/search` : '/api/v1/senders/search', base);
  const allowed = broadcast ? ['keyword', 'source_name', 'source_type', 'start_date', 'end_date', 'page', 'size', 'sort_by', 'sort_order', 'status'] : action === 'search_post' ? ['keyword', 'event_type', 'start_date', 'end_date', 'sort_by', 'sort_order', 'page', 'cursor'] : ['username', 'name', 'page', 'size'];
  for (const key of allowed) { const value = params[key]; if (value?.trim()) url.searchParams.set(key, value.trim()); }
  if (broadcast) url.searchParams.set('source_type', platform);
  if (action === 'search_profile') url.searchParams.set('platform', platform);
  return url;
}
export function previewResult(platform: Platform, action: Action): ApiResult {
  if (platform === 'tv' || platform === 'radio') {
    const isRadio = platform === 'radio';
    const sample: Item = {
      source_name: isRadio ? 'trijaya_104.6_fm' : 'kompas_tv', source_type: platform,
      file_hash: 'broadcast-preview-sample', file_path: '', file_len: 59, date: '2026-11-26',
      time_start: 1795706698, time_end: 1795706757,
      text: 'Contoh transkrip siaran untuk preview SocioScope. Jalankan pencarian untuk memuat rekaman dan transkrip asli.',
      language: 'id', status: 'transcribed', projects: ['socia'], storage_type: 's3',
      segments_raw: [{ start: 0, end: 8.5, text: 'Contoh segmen transkrip siaran.' }],
      text_segments: '00:00:00.000 --> 00:00:08.500\\nContoh segmen transkrip siaran.',
      keywords: ['contoh', 'siaran'], topic: 'Informasi', sentiments: {}, auto_tags: [],
    };
    return { http_status: 200, payload: { status: 'success', status_code: 200, data: [sample], pagination: { total_items: 1, total_pages: 1, current_page: 1, page_size: 10 }, billing: { remaining_credits: null, credit_used: 0 }, time: { value: 'Preview' } } };
  }
  const posts: Item[] = [
    { author_name: 'Nadia Putri', author_username: 'nadiaputri', lang: 'id', published_at: '2026-11-26T07:32:00Z', original_id: '7441023896502189318', text: 'Weekend well spent! ☕ Menemukan hidden gem coffee shop di Jakarta. Tempatnya cozy banget, kopinya juga juara. Siapa yang udah pernah ke sini?', hashtags: ['coffeeshop', 'jakarta', 'hiddengem', 'kopilokal'], engagement: 14820, likes: 12500, comments: 320, shares: 2000, views: 185600, reach: null },
    { author_name: 'Rizky Pratama', author_username: 'rizkypratama', lang: 'id', published_at: '2026-11-26T06:15:00Z', original_id: '7441023678211548902', text: 'POV: kamu akhirnya nemu kopi yang pas sama selera kamu 🤌 Review jujur 3 coffee shop favorit di Jakarta. Nomor 3 wajib masuk list kalian!', hashtags: ['coffeeshop', 'coffeetok', 'jakarta', 'reviewkopi'], engagement: 8650, likes: 7200, comments: 450, shares: 1000, views: 92400, reach: null },
    { author_name: 'Kopi & Cerita', author_username: 'kopidancerita', lang: 'id', published_at: '2026-11-26T05:40:00Z', original_id: '7441012894592873021', text: 'Setiap cangkir punya cerita. Pagi ini, ceritanya tentang slow mornings dan aroma kopi yang baru diseduh. Selamat menikmati hari kalian. ☕', hashtags: ['coffeeshop', 'kopiindonesia', 'slowmorning'], engagement: 3240, likes: 2800, comments: 140, shares: 300, views: 38600, reach: null },
  ];
  if (platform === 'news' && action === 'search_post') {
    const articles: Item[] = [
      { original_id: '6b08f5c7b41037b996b7e3f0', platform: 'news', type: 'post', published_at: '2026-11-25T10:57:33Z', title: 'APBD Kepri 2027 Disetujui, Fraksi Soroti BUMD Hingga Bansos | Seputar Kepri', text: 'DPRD Provinsi Kepulauan Riau menyetujui Ranperda APBD 2027 dengan sejumlah catatan fraksi, termasuk evaluasi BUMD, efisiensi belanja, infrastruktur, dan bantuan sosial.', url: 'https://seputarkepri.co.id/2026/11/25/apbd-kepri-2027-disetujui-fraksi-soroti-bumd-hingga-bansos/', author_name: 'seputarkepri.co.id', domain: { domain_name: 'seputarkepri.co.id' }, engagement: 0, likes: null, comments: 0, shares: 0, images: null, videos: null },
      { original_id: '6b079a040b5add90f4e5787b', platform: 'news', type: 'post', published_at: '2026-11-25T09:59:23Z', title: 'Bunga KPR Floating November 2026: BCA 11%, Bank Lain hingga 13,5% - Bisnis.com', text: 'Artikel membahas perubahan suku bunga KPR floating sejumlah bank pada November 2026 dan langkah yang dapat dipertimbangkan debitur.', url: 'https://finansial.bisnis.com/read/20261125/90/2024398/bunga-kpr-floating-november-2026-bca-11-bank-lain-hingga-135', author_name: 'finansial.bisnis.com', domain: { domain_name: 'finansial.bisnis.com' }, engagement: 0, likes: null, comments: 0, shares: 0, images: null, videos: null },
    ];
    return { http_status: 200, payload: { status: 'success', status_code: 200, platform: 'news', time: { value: '18.880 ms', setTimeBeforeActions: true }, billing: { remaining_credits: 2485.5, credit_used: 0.1 }, data: articles, pagination: { total_items: 231, total_pages: 24, current_page: 2, page_size: 10, next_cursor: null } } };
  }
  if (platform === 'twitter' && action === 'search_profile') {
    return { http_status: 200, payload: { status: 'success', status_code: 200, message: 'Data berhasil ditemukan', time: { value: '175.784 ms', setTimeBeforeActions: true }, billing: { package_id: 5, package_name: 'Credit Standard Pack (2,500 Credits)', remaining_credits: 2493.1 }, total_data: 1, data: [{ platform: 'twitter', original_id: 'twitter-profile-preview', username: 'socioapi', fullname: 'SocioAPI', name: 'SocioAPI', bio: 'Social media data and analytics.', avatar: null, profile_picture: null, url: 'https://x.com/socioapi', follower_count: 12500, following_count: 320, event_count: 840, is_verified: false, verified: false, is_private: false, private: false, locations: [], location: null, last_seen: null, targeted: false, bot: false }], pagination: { total_items: 1, total_pages: 1, current_page: 1, page_size: 10 } } };
  }
  if (platform === 'twitter' && action === 'search_post') {
    const twitterPosts: Item[] = [
      { original_id: 'twitter-post-preview-1', title: 'Contoh hasil pencarian X', text: 'Ini adalah contoh respons Twitter Search Post SocioAPI. Ganti dengan hasil pencarian nyata untuk melihat percakapan.', url: 'https://x.com/socioapi', published_at: '2026-11-26T07:32:00Z', author_username: 'socioapi', author_name: 'SocioAPI', likes: 125, comments: 18, shares: 32, views: 4200, images: [], videos: [] },
    ];
    return { http_status: 200, payload: { status: 'success', status_code: 200, data: twitterPosts, pagination: { total_items: 1, total_pages: 1, current_page: 1, page_size: 10 }, billing: { remaining_credits: null, credit_used: 0 }, time: { value: null } } };
  }
  if (platform === 'threads' && action === 'search_post') {
    const threadPosts: Item[] = [
      { platform: 'threads', original_id: '4011386309775528550', time: 1792969872, type: 'post', sender_id: '28978151893', sender_username: 'hakahaki_id', sender_name: 'HakaHaki', sender_avatar: null, sender_url: 'https://threads.com/@hakahaki_id', url: 'https://threads.com/@hakahaki_id/post/DerTphzCRJm', post: 'UPDATE: Prabowo berikan pesan khusus kepada Ketua OJK. "Tindak tegas coordinated trading!"', lang: 'id', engagement: 27, publish_date: 1792414533, images: [], videos: [], share_count: 9, comment_count: 18, impression: 14771, like_count: 75, quote_count: 0, repost_count: 1 },
      { platform: 'threads', original_id: '4015971346974705432', time: 1792969872, type: 'post', sender_id: '11396511735', sender_username: 'celebeska', sender_name: '', sender_avatar: null, sender_url: 'https://threads.com/@celebeska', url: 'https://threads.com/@celebeska/post/De7mKmckwcY', post: 'Presiden Prabowo Subianto menekankan pentingnya disiplin komunikasi di lingkungan kabinet agar pernyataan pejabat tidak memicu polemik di tengah masyarakat.', lang: 'id', engagement: 1, publish_date: 1792961112, images: [{ id: '4015971346974705432', original_url: 'https://example.com/threads-preview-image.webp' }], videos: [], share_count: 0, comment_count: 1, impression: 133, like_count: 0, quote_count: 0, repost_count: 0 },
    ];
    return { http_status: 200, payload: { status: 'success', status_code: 200, time: { value: '23.310 ms', setTimeBeforeActions: true }, billing: { plan_type: 'CREDIT', plan_name: 'Starter', remaining_credits: 34 }, data: threadPosts, pagination: { total_items: 25006, total_pages: 2501, current_page: 1, page_size: 10 } } };
  }
  if (platform === 'threads' && action === 'search_profile') {
    return { http_status: 200, payload: { status: 'success', status_code: 200, message: 'Data berhasil ditemukan', time: { value: '5.276 ms', setTimeBeforeActions: true }, billing: { package_id: 5, package_name: 'Credit Standard Pack (2,500 Credits)', remaining_credits: 2486.6 }, total_data: 1, data: [{ platform: 'threads', original_id: '80078803921', username: 'nasdem.50kota', name: 'Nasdem 50 kota Official', avatar: 'https://scontent-cgk2-1.cdninstagram.com/v/t51.82787-19/619487217_17847513984667922_1761754493713548023_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-cgk2-1.cdninstagram.com&_nc_cat=102&_nc_oc=Q6cZ2gG6ejqkiE9sm6JL4lW0FtxNpdn92uZIM0Pi-7PfHpzPK9-n3YnJ57ainy6HMSAkpgs&_nc_ohc=p2KyHfj6u6wQ7kNvwGyokpi&_nc_gid=ZPzAPku4jyYQzutOeT1L6A&edm=AJhczIQBAAAA&ccb=7-5&oh=00_AQP4HaBMFn3r_4XbPyQmdHewyqv63vDhs9GAkgtBnI5tGg&oe=6AD32247&_nc_sid=4a2096', url: 'https://threads.com/@nasdem.50kota', personal_websites: [], external_links: [], last_seen: 1791842946, platformid: 'threads_80078803921', profile_picture: 'https://scontent-cgk2-1.cdninstagram.com/v/t51.82787-19/619487217_17847513984667922_1761754493713548023_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=scontent-cgk2-1.cdninstagram.com&_nc_cat=102&_nc_oc=Q6cZ2gG6ejqkiE9sm6JL4lW0FtxNpdn92uZIM0Pi-7PfHpzPK9-n3YnJ57ainy6HMSAkpgs&_nc_ohc=p2KyHfj6u6wQ7kNvwGyokpi&_nc_gid=ZPzAPku4jyYQzutOeT1L6A&edm=AJhczIQBAAAA&ccb=7-5&oh=00_AQP4HaBMFn3r_4XbPyQmdHewyqv63vDhs9GAkgtBnI5tGg&oe=6AD32247&_nc_sid=4a2096', location: null }], pagination: { total_items: 1, total_pages: 1, current_page: 1, page_size: 10 } } };
  }
  if (platform === 'youtube' && action === 'search_profile') {
    return { http_status: 200, payload: { status: 'success', status_code: 200, message: 'Data tidak ditemukan', time: { value: '6.447 ms' }, billing: { remaining_credits: 2488.6 }, total_data: 3, data: [], pagination: { total_items: 3, total_pages: 1, current_page: 2, page_size: 10 } } };
  }
  if (platform === 'youtube' && action === 'search_post') {
    const videos: Item[] = [
      { original_id: '2qqsTX7kfWE', type: 'post', published_at: '2018-06-06T11:44:21Z', title: 'Tangkal Radikalisme di Sekolah (Ngopi Sore Episode 26)', text: 'Hj. Titik Prasetyowati Verdi, S.H., M.H., telah resmi dilantik sebagai anggota DPR RI Fraksi NasDem sejak (18/5) yang lalu.', url: 'https://www.youtube.com/watch?v=2qqsTX7kfWE', lang: 'id', author_id: 'UCl69eCjpUj-JwCjGLpzR6kw', author_name: 'NasDem TV', author_username: 'officialNasDem', author_url: 'https://www.youtube.com/@officialNasDem', author_avatar: null, engagement: 0, likes: 5, comments: 0, shares: 0, views: 151, reach: null, images: [], videos: [{ id: '2qqsTX7kfWE', original_url: 'https://www.youtube.com/watch?v=2qqsTX7kfWE', caption: null }] },
      { original_id: '1xJST8cSZ2Q', type: 'post', published_at: '2026-11-17T14:09:48Z', title: 'PAN dan NasDem Dukung Penuh Sufmi Dasco Ahmad Dampingi Prabowo sebagai Wakil Presiden', text: 'Partai Amanat Nasional (PAN) dan Partai NasDem secara resmi menyatakan dukungan agar Dasco mendampingi Presiden ...', url: 'https://www.youtube.com/shorts/1xJST8cSZ2Q', lang: 'id', author_id: 'UCZiPf2PW88AY-I3Jq398trQ', author_name: 'khabarnet', author_username: 'khabarnet_tv', author_url: 'https://www.youtube.com/@khabarnet_tv', author_avatar: null, engagement: 0, likes: 1, comments: 0, shares: 0, views: 2094, reach: null, images: [], videos: [{ id: '1xJST8cSZ2Q', original_url: 'https://www.youtube.com/shorts/1xJST8cSZ2Q', caption: null }] },
    ];
    return { http_status: 200, payload: { data: videos, pagination: { total_items: 425, total_pages: 43, current_page: 2, page_size: 10, next_cursor: null }, billing: { remaining_credits: null, credit_used: 0 }, time: { value: null } } };
  }
  const profiles = posts.map((p, index) => ({ fullname: p['author_name'], username: p['author_username'], bio: ['Coffee enthusiast · Jakarta ☕\nSharing places, one cup at a time.', 'Lifestyle, coffee & everyday stories.\nJakarta, Indonesia 🇮🇩', 'Kopi lokal. Cerita setiap hari. ☕'][index], verified: index === 1, followers: [248500, 186200, 32700][index], following: [482, 321, 128][index], likes: [3200000, 1800000, null][index], videos: [284, 196, 82][index], posts: [428, 315, 201][index], original_id: p['original_id'] }));
  return { http_status: 200, payload: { data: action === 'search_post' ? posts.map(p => ({ ...p, url: platform === 'tiktok' ? `https://www.tiktok.com/@${p['author_username']}/video/${p['original_id']}` : platform === 'instagram' ? `https://www.instagram.com/${p['author_username']}/` : undefined })) : profiles, pagination: { total_items: 3, current_page: 1, page_size: 3, total_pages: 1, next_cursor: null }, billing: { remaining_credits: null, credits_used: 0 }, time: { value: null } } };
}
