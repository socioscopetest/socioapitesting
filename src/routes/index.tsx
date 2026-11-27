import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Activity, ArrowUpRight, ArrowRight, ArrowLeft, Bell, ChevronRight, CircleHelp, Code2, Coins, Copy, Database, FileText, Globe2, History, Instagram, LayoutDashboard, Loader2, Music2, RefreshCw, Search, ShieldCheck, UserRound, Users, Zap, Clock3, Layers, Hash, Radio, Youtube, Facebook, AtSign, Newspaper, CheckCircle2, LogOut } from 'lucide-react';
import { LovableMark } from '@lovable.dev/cloud-auth-js/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { searchSocioAPI } from '@/features/monitoring/search.functions';
import { listMonitoringSearches } from '@/features/monitoring/history.functions';
import { ResultCard } from '@/features/monitoring/results';
import { AuthDialog } from '@/features/auth/auth-dialog';
import { asRecord, display, getItems, numberValue, creditsUsed, dateWIB, previewResult, responseError, latencyDisplay, emptyResultsMessage, type Platform, type Action, type ApiResult, type Item, type SavedInstagramSearch } from '@/features/monitoring/data';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'SocioScope — Social Media Monitoring' },
    { name: 'description', content: 'Cari postingan dan profil TikTok, Instagram, Facebook, YouTube, Threads, X / Twitter, dan News. Pantau percakapan, engagement, dan kredit SocioAPI dalam satu dashboard.' },
    { property: 'og:title', content: 'SocioScope — Social Media Monitoring' },
    { property: 'og:description', content: 'Dashboard monitoring multi-platform untuk pencarian postingan dan profil TikTok, Instagram, Facebook, YouTube, dan Threads.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="min-w-0"><span className="field-label">{label}</span>{children}</label>; }
function savedQuery(saved: SavedInstagramSearch): string {
  try { const params = asRecord(JSON.parse(saved.params_json)); return display(params['keyword'] ?? params['username'] ?? params['name']); }
  catch { return 'N/A'; }
}
function Index() {
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [action, setAction] = useState<Action>('search_post');
  const [result, setResult] = useState<ApiResult>(() => previewResult('tiktok', 'search_post'));
  const [preview, setPreview] = useState(true);
  const [keyword, setKeyword] = useState('coffeeshop');
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [sortBy, setSortBy] = useState('time'); const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1); const [cursor, setCursor] = useState('');
  const [username, setUsername] = useState(''); const [name, setName] = useState(''); const [size, setSize] = useState(10);
  const [sourceName, setSourceName] = useState(''); const [broadcastStatus, setBroadcastStatus] = useState('transcribed');
  const [history, setHistory] = useState<Record<Platform, string[]>>({ tiktok: [], instagram: [], facebook: [], youtube: [], threads: [], twitter: [], news: [], tv: [], radio: [] });
  const [filter, setFilter] = useState(''); const [raw, setRaw] = useState(false);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [inspect, setInspect] = useState<Item | null>(null);
  const [help, setHelp] = useState(false); const [notifications, setNotifications] = useState(false);
  const [user, setUser] = useState<string | null>(null); const [authOpen, setAuthOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedInstagramSearch[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [syncedSearchId, setSyncedSearchId] = useState<string | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);
  const searchAPI = useServerFn(searchSocioAPI);
  const listSavedSearches = useServerFn(listMonitoringSearches);
  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try { setSavedSearches(await listSavedSearches()); }
    catch { toast.error('Riwayat pencarian belum dapat dimuat. Silakan coba lagi.'); }
    finally { setHistoryLoading(false); }
  }, [listSavedSearches]);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setUser(data.session?.user.email ?? data.session?.user.id ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user.email ?? session?.user.id ?? null); });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (user) void refreshHistory();
    if (!user) setSavedSearches([]);
  }, [user, platform, refreshHistory]);
  const platformName = platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : platform === 'facebook' ? 'Facebook' : platform === 'youtube' ? 'YouTube' : platform === 'threads' ? 'Threads' : platform === 'news' ? 'News' : platform === 'tv' ? 'TV Broadcast' : platform === 'radio' ? 'Radio Broadcast' : 'X / Twitter';
  const post = action === 'search_post';
  const pagination = asRecord(result.payload['pagination']);
  const items = getItems(result.payload);
  const currentPage = numberValue(pagination['current_page']) ?? page;
  const totalPages = numberValue(pagination['total_pages']);
  const nextCursor = typeof pagination['next_cursor'] === 'string' && pagination['next_cursor'] ? pagination['next_cursor'] : null;
  const filtered = items.filter(item => JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));
  const used = creditsUsed(result);
  function changeMode(p: Platform, a: Action) {
    const nextAction = p === 'news' || p === 'tv' || p === 'radio' ? 'search_post' : a;
    setPlatform(p); setAction(nextAction); setPage(1); setCursor(''); setFilter(''); setError(''); setRaw(false);
    setPreview(true); setResult(previewResult(p, nextAction)); setSyncedSearchId(null); setViewingSaved(false);
  }
  async function signIn() {
    const response = await lovable.auth.signInWithOAuth('lovable', { redirect_uri: window.location.origin });
    if (response.error) toast.error('Tidak dapat masuk. Silakan coba kembali.');
    else if (!response.redirected) { setAuthOpen(false); toast.success('Berhasil masuk. Anda dapat menjalankan pencarian.'); }
  }
  function openSavedSearch(saved: SavedInstagramSearch) {
    try {
      const params = asRecord(JSON.parse(saved.params_json));
      const payload = asRecord(JSON.parse(saved.response_json));
      const savedPage = Number(params['page']);
      const savedSize = Number(params['size']);
      setPlatform(saved.platform); setAction(saved.action); setResult({ http_status: saved.http_status, payload });
      setPreview(false); setViewingSaved(true); setSyncedSearchId(saved.id); setError(''); setRaw(false); setFilter(''); setHistoryOpen(false);
      setKeyword(typeof params['keyword'] === 'string' ? params['keyword'] : '');
      setStart(typeof params['start_date'] === 'string' ? params['start_date'] : '');
      setEnd(typeof params['end_date'] === 'string' ? params['end_date'] : '');
      setSortBy(typeof params['sort_by'] === 'string' ? params['sort_by'] : 'time');
      setSortOrder(typeof params['sort_order'] === 'string' ? params['sort_order'] : 'desc');
      setUsername(typeof params['username'] === 'string' ? params['username'] : '');
      setName(typeof params['name'] === 'string' ? params['name'] : '');
      setCursor(typeof params['cursor'] === 'string' ? params['cursor'] : '');
      setPage(Number.isFinite(savedPage) && savedPage > 0 ? savedPage : 1);
      setSize(Number.isFinite(savedSize) && savedSize > 0 ? Math.min(100, savedSize) : 10);
      setSourceName(typeof params['source_name'] === 'string' ? params['source_name'] : '');
      setBroadcastStatus(typeof params['status'] === 'string' ? params['status'] : 'transcribed');
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      toast.success('Hasil tersimpan dibuka · 0 kredit baru');
    } catch { toast.error('Data tersimpan tidak dapat dibaca.'); }
  }
  async function runSearch(targetPage = page, targetCursor = cursor) {
    if (post && !keyword.trim()) { setError('Keyword / Hashtag wajib diisi.'); return; }
    if (!post && platform !== 'tv' && platform !== 'radio' && !username.trim() && !name.trim()) { setError('Isi Username atau Name untuk mencari profil.'); return; }
    if (start && end && start > end) { setError('Start Date tidak boleh setelah End Date.'); return; }
    if (!user) { setAuthOpen(true); return; }
    setLoading(true); setError('');
    try {
      const params = platform === 'tv' || platform === 'radio' ? { keyword, source_name: sourceName, source_type: platform, start_date: start, end_date: end, page: String(targetPage), size: String(size), sort_by: 'time_start', sort_order: sortOrder, status: broadcastStatus } : post ? { keyword, event_type: platform === 'threads' ? 'post' : '', start_date: start, end_date: end, sort_by: sortBy, sort_order: sortOrder, page: String(targetPage), cursor: targetCursor } : { username, name, page: String(targetPage), size: String(size) };
      const wire = await searchAPI({ data: { platform, action, params } });
      const response: ApiResult = { http_status: wire.http_status, outbound_ip: wire.outbound_ip, payload: asRecord(JSON.parse(wire.payloadJSON)) };
      setResult(response); setPreview(false); setPage(targetPage); setCursor(targetCursor); setSyncedSearchId(wire.synced_search_id); setViewingSaved(false);
      const remaining = numberValue(asRecord(response.payload['billing'])['remaining_credits']);
      if (remaining !== null) setCredits(remaining);
      if (response.http_status !== 200) setError(responseError(response));
      else {
        if (!post && username.trim()) setHistory(old => ({ ...old, [platform]: [username.trim(), ...old[platform].filter(u => u !== username.trim())].slice(0, 5) }));
        const count = getItems(response.payload).length;
        if (wire.sync_error) toast.warning(`${count} ${platform === 'tv' || platform === 'radio' ? 'rekaman siaran' : post ? 'postingan' : 'profil'} diterima, tetapi riwayat belum tersimpan.`);
        else if (wire.synced_search_id) {
          await refreshHistory();
          toast.success(`${count} ${platform === 'tv' || platform === 'radio' ? 'rekaman siaran' : post ? 'postingan' : 'profil'} diterima dan tersimpan`);
        } else toast.success(`${count} ${platform === 'tv' || platform === 'radio' ? 'rekaman siaran' : post ? 'postingan' : 'profil'} diterima`);
      }
    } catch { setError('Pencarian gagal. Periksa koneksi atau masuk kembali, lalu coba lagi.'); }
    finally { setLoading(false); }
  }
  async function copyJSON(value: unknown = preview ? result.payload : result) {
    try { await navigator.clipboard.writeText(JSON.stringify(value, null, 2)); toast.success('JSON berhasil disalin'); }
    catch { toast.error('Tidak dapat menyalin JSON. Periksa izin clipboard browser.'); }
  }
  return <div className="min-h-screen">
    <aside className="app-rail" aria-label="Navigasi dashboard">
      <a href="#dashboard" className="brand-symbol" aria-label="SocioScope"><Activity size={24} strokeWidth={2.5} /></a>
      <div className="flex flex-col gap-4"><Button variant="ghost" size="icon" className="rail-active" title="Dashboard" aria-label="Dashboard" onClick={() => document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })}><LayoutDashboard /></Button><Button variant="ghost" size="icon" title="Search Post" aria-label="Search Post" className="text-muted-foreground" onClick={() => changeMode(platform, 'search_post')}><Search /></Button><Button variant="ghost" size="icon" title="Search Profile" aria-label="Search Profile" className="text-muted-foreground" onClick={() => changeMode(platform, 'search_profile')}><Users /></Button><Button variant="ghost" size="icon" title="Raw JSON Response" aria-label="Raw JSON Response" className="text-muted-foreground" onClick={() => { setRaw(true); document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }); }}><Code2 /></Button></div>
      <div className="mt-auto flex flex-col items-center gap-5"><Button variant="ghost" size="icon" title="Bantuan" aria-label="Bantuan" className="text-muted-foreground" onClick={() => setHelp(true)}><CircleHelp /></Button><Button variant="ghost" size="icon" title={user ? 'Akun' : 'Masuk'} aria-label={user ? 'Akun' : 'Masuk'} className="rounded-full bg-secondary" onClick={() => setAuthOpen(true)}><UserRound /></Button></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="flex items-center gap-2.5 text-[11px]"><span className="text-muted-foreground">Workspace</span><ChevronRight size={12} className="text-muted-foreground" /><span className="font-semibold">Social Monitoring</span></div><div className="flex items-center gap-4"><span className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex"><ShieldCheck size={13} className="text-primary" /> Secure connection</span><Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Notifikasi" title="Notifikasi" onClick={() => setNotifications(true)}><Bell /></Button><div className="h-5 border-l border-border" /><Button variant="ghost" size="icon" className="rounded-full bg-secondary text-[10px]" aria-label="Akun workspace" onClick={() => setAuthOpen(true)}>{user ? user.slice(0, 2).toUpperCase() : 'SC'}</Button></div></header>
      <main className="dashboard" id="dashboard">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-1.5 flex items-center gap-2"><h1 className="page-heading">SocioScope</h1><span className="mt-1 rounded border border-border bg-card px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">MONITORING</span></div><h2 className="text-[12px] text-muted-foreground">Social Media Monitoring <span className="px-1.5 text-border">/</span> Multi-platform intelligence</h2></div><div className="credit-badge"><Coins size={17} /><span className="text-[11px]">Credits:</span><strong className="font-mono text-[17px]">{credits === null ? 'N/A' : credits.toLocaleString('en-US')}</strong><span className="ml-2 border-l border-primary/20 pl-3"><Zap size={13} /></span></div></div>
        <section className="mt-8" aria-label="Platform coverage"><div className="flex items-center gap-2"><Globe2 size={12} className="text-muted-foreground" /><h2 className="section-caption">Platform coverage</h2><span className="text-[9px] text-muted-foreground">9 connected sources</span></div><div className="platform-row">
          <Button variant="ghost" className={`platform-button ${platform === 'tiktok' ? 'selected' : ''}`} onClick={() => changeMode('tiktok', action)} disabled={loading}><Music2 /><span className="text-[12px] font-bold">TikTok</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'tiktok' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'instagram' ? 'selected' : ''}`} onClick={() => changeMode('instagram', action)} disabled={loading}><Instagram className="text-instagram" /><span className="text-[12px] font-bold">Instagram</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'instagram' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'facebook' ? 'selected' : ''}`} onClick={() => changeMode('facebook', action)} disabled={loading}><Facebook className="text-[#1877F2]" /><span className="text-[12px] font-bold">Facebook</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'facebook' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <div className="mx-1 hidden h-6 border-l border-border xl:block" />
          <Button variant="ghost" className={`platform-button ${platform === 'youtube' ? 'selected' : ''}`} onClick={() => changeMode('youtube', 'search_post')} disabled={loading}><Youtube className="text-[#FF0033]" /><span className="text-[12px] font-bold">YouTube</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'youtube' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'threads' ? 'selected' : ''}`} onClick={() => changeMode('threads', action)} disabled={loading}><AtSign className="text-foreground" /><span className="text-[12px] font-bold">Threads</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'threads' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'twitter' ? 'selected' : ''}`} onClick={() => changeMode('twitter', action)} disabled={loading}><AtSign /><span className="text-[12px] font-bold">X / Twitter</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'twitter' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'news' ? 'selected' : ''}`} onClick={() => changeMode('news', 'search_post')} disabled={loading}><Newspaper className="text-primary" /><span className="text-[12px] font-bold">News</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'news' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'tv' ? 'selected' : ''}`} onClick={() => changeMode('tv', 'search_post')} disabled={loading}><Radio /><span className="text-[12px] font-bold">TV Broadcast</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'radio' ? 'selected' : ''}`} onClick={() => changeMode('radio', 'search_post')} disabled={loading}><Radio /><span className="text-[12px] font-bold">Radio Broadcast</span></Button>
        </div></section>
        <section aria-label="Database integration setup" className="mt-3 rounded-md border border-primary/20 bg-success-soft px-4 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Database size={18} className="shrink-0 text-primary" /><div><p className="text-[11px] font-semibold text-primary">Monitoring database · Synced</p><p className="mt-1 text-[10px] text-muted-foreground">{viewingSaved ? 'Hasil tersimpan dibuka tanpa request SocioAPI atau kredit baru.' : syncedSearchId ? 'Pencarian terakhir sudah tersimpan dan dapat dibuka kembali.' : 'Respons HTTP 200 dari seluruh platform disimpan otomatis per akun. Riwayat dapat dibuka ulang tanpa menggunakan kredit SocioAPI.'}</p></div></div><Button variant="outline" size="sm" className="text-[10px]" onClick={() => setHistoryOpen(true)}><History />Saved searches<span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px]">{savedSearches.length}</span></Button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded border border-border/70 bg-background/70 p-3"><p className="text-[10px] font-semibold">{platform === 'news' ? 'Search Articles' : platform === 'tv' || platform === 'radio' ? 'Broadcast Search' : 'Search Post'}</p><code className="mt-1 block break-all text-[10px] text-muted-foreground">{`GET ${platform === 'tv' || platform === 'radio' ? '/api/v1/transcribe/search' : `/api/v1/events/${platform}/search`}`}</code><p className="mt-1 text-[9px] text-muted-foreground">{platform === 'tv' || platform === 'radio' ? 'Keyword, station, status, date range, sort, page, size' : 'Keyword, date range, sort, page, cursor'}</p></div><div className="rounded border border-border/70 bg-background/70 p-3"><p className="text-[10px] font-semibold">Search Profile</p><code className="mt-1 block break-all text-[10px] text-muted-foreground">{`GET /api/v1/senders/search?platform=${platform}`}</code><p className="mt-1 text-[9px] text-muted-foreground">Username atau name, page, size</p></div></div><p className="mt-3 text-[9px] text-muted-foreground">SOCIOAPI_API_KEY hanya digunakan di server. Riwayat pencarian terpisah untuk setiap akun melalui Supabase Auth dan RLS.</p></section>
        <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Search endpoints">
          <Button variant="ghost" className={`endpoint-card ${post ? 'selected' : ''}`} disabled={loading} onClick={() => changeMode(platform, 'search_post')}><span className="endpoint-icon"><FileText /></span><span className="ml-1 flex-1"><span className="block text-[13px] font-bold">1. {platform === 'tv' || platform === 'radio' ? `${platformName} Search API` : platform === 'news' ? 'News Search Articles API' : `${platformName} Search Post API`}</span><span className="mt-1.5 block text-[10px] text-muted-foreground">{platform === 'tv' || platform === 'radio' ? 'Cari rekaman siaran dan transkrip berdasarkan keyword' : 'Telusuri postingan berdasarkan keyword atau hashtag'}</span></span>{post ? <CheckCircle2 className="text-primary" /> : <ArrowUpRight className="text-muted-foreground" />}</Button>
          <Button variant="ghost" className={`endpoint-card ${!post ? 'selected' : ''}`} disabled={loading || platform === 'news' || platform === 'tv' || platform === 'radio'} onClick={() => changeMode(platform, 'search_profile')}><span className="endpoint-icon"><UserRound /></span><span className="ml-1 flex-1"><span className="block text-[13px] font-bold">2. {platformName} Search Profile API</span><span className="mt-1.5 block text-[10px] text-muted-foreground">Temukan profil dan statistik akun media sosial</span></span>{!post ? <CheckCircle2 className="text-primary" /> : <ArrowUpRight className="text-muted-foreground" />}</Button>
        </section>
        {platform === 'news' && <p className="mt-3 rounded-md border border-primary/20 bg-success-soft px-4 py-3 text-[11px] text-muted-foreground">News mendukung Search Articles melalui endpoint <code>/api/v1/events/news/search</code>. Search Profile tidak tersedia untuk platform ini.</p>}
        <section className="mt-7 border-b border-border pb-7" aria-label="Form pencarian"><form onSubmit={event => { event.preventDefault(); void runSearch(); }}>
          {post ? <><div className="flex items-end gap-3"><div className="min-w-0 flex-1"><Field label="Keyword / Hashtag *"><div className="relative"><Hash size={15} className="absolute left-3.5 top-3.5 text-muted-foreground" /><Input aria-label="Keyword / Hashtag" className="search-input pl-10" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Masukkan keyword atau hashtag" /></div></Field></div><Button type="submit" className="h-[43px] px-5 text-[11px]" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />}<span className="hidden sm:inline">Run {platform === 'tv' || platform === 'radio' ? 'Broadcast Search' : platform === 'news' ? 'Search Articles' : 'Search Post'}</span><span className="sm:hidden">Search</span></Button></div>
          <div className="filter-grid mt-5">{(platform === 'tv' || platform === 'radio') && <><Field label="Nama Stasiun / Kanal"><Input aria-label="Nama Stasiun / Kanal" className="search-input h-10" value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder={platform === 'tv' ? 'contoh: kompas_tv' : 'contoh: trijaya_104.6_fm'} /></Field><Field label="Status Transkripsi"><select aria-label="Status Transkripsi" className="select-input" value={broadcastStatus} onChange={e => setBroadcastStatus(e.target.value)}><option value="transcribed">Transcribed</option><option value="pending">Pending</option></select></Field><Field label="Size"><Input aria-label="Size" className="search-input h-10" type="number" min={1} max={100} value={size} onChange={e => setSize(Math.min(100, Math.max(1, Number(e.target.value))))} /></Field></>}<Field label="Start Date"><Input aria-label="Start Date" className="search-input h-10" type="date" value={start} onChange={e => setStart(e.target.value)} /></Field><Field label="End Date"><Input aria-label="End Date" className="search-input h-10" type="date" value={end} onChange={e => setEnd(e.target.value)} /></Field>{!(platform === 'tv' || platform === 'radio') && <Field label="Sort By"><select aria-label="Sort By" className="select-input" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="time">Time</option><option value="engagement">Engagement</option></select></Field>}<Field label="Sort Order"><select aria-label="Sort Order" className="select-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></Field><Field label="Page"><Input aria-label="Page" className="search-input h-10 font-mono" type="number" min={1} value={page} onChange={e => setPage(Math.max(1, Number(e.target.value)))} /></Field>{!(platform === 'tv' || platform === 'radio') && <Field label="Cursor"><Input aria-label="Cursor" className="search-input h-10 font-mono" value={cursor} onChange={e => setCursor(e.target.value)} placeholder="Optional cursor" /></Field>}</div></> : <><div className="grid grid-cols-2 items-end gap-4 lg:grid-cols-[2fr_2fr_.6fr_.6fr_auto]"><Field label="Username"><Input aria-label="Username" className="search-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="contoh: nadiaputri" /></Field><Field label="Name"><Input aria-label="Name" className="search-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nama profil" /></Field><Field label="Page"><Input aria-label="Page" className="search-input" type="number" min={1} value={page} onChange={e => setPage(Math.max(1, Number(e.target.value)))} /></Field><Field label="Size"><Input aria-label="Size" className="search-input" type="number" min={1} max={100} value={size} onChange={e => setSize(Math.min(100, Math.max(1, Number(e.target.value))))} /></Field><Button type="submit" className="h-[43px] text-[11px]" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />}Run Search Profile</Button></div>{history[platform].length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[10px] text-muted-foreground">Riwayat akun</span>{history[platform].map(account => <Button key={account} size="sm" variant="secondary" type="button" onClick={() => setUsername(account)}>@{account}</Button>)}</div>}</>}
        </form>{error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><CircleHelp size={15} className="shrink-0" />{error}</div>}</section>
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan pencarian">
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Hasil di Halaman Ini</span><FileText size={14} /></div><div className="kpi-number">{items.length}</div><p className="mt-2 text-[9px] text-muted-foreground">{post ? 'Postingan' : 'Profil'} yang benar-benar dikembalikan</p></div>
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Total Halaman</span><Layers size={14} /></div><div className="kpi-number">{display(pagination['current_page'])}<span className="ml-2 text-[11px] font-normal text-muted-foreground">current page</span></div><p className="mt-2 text-[9px] text-muted-foreground">{display(pagination['page_size'])} items per page</p></div>
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Total Seluruh Halaman</span><Copy size={14} /></div><div className="kpi-number">{display(pagination['total_pages'])}</div><p className="mt-2 text-[9px] text-muted-foreground">Halaman tersedia</p></div>
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Status HTTP & Latensi</span><Activity size={14} /></div><div className={`mt-4 flex items-center gap-2 text-[22px] font-semibold ${result.http_status === 200 ? 'text-primary' : 'text-destructive'}`}><span className="status-dot" />{preview ? 'Preview' : viewingSaved ? 'Saved' : `${result.http_status} ${result.http_status === 200 ? 'OK' : 'Error'}`}</div><p className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground"><Clock3 size={10} />{latencyDisplay(asRecord(result.payload['time'])['value'])}<span className="mx-1">·</span>{viewingSaved ? `0 kredit baru · ${display(used)} kredit awal` : `${display(used)} kredit terpakai`}</p></div>
        </section>
        <section className="mt-8" id="results" aria-label="Hasil pencarian"><div className="results-heading"><div className="view-tabs"><Button variant="ghost" className={`view-tab ${!raw ? 'selected' : ''}`} onClick={() => setRaw(false)}><FileText />{platform === 'tv' || platform === 'radio' ? 'Broadcast' : post ? 'Postingan' : 'Profile'} {platformName}<span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{items.length}</span></Button><Button variant="ghost" className={`view-tab ${raw ? 'selected' : ''}`} onClick={() => setRaw(true)}><Code2 /><span className="hidden sm:inline">Raw JSON Response</span><span className="sm:hidden">JSON</span></Button></div><div className="flex items-center gap-3"><div className="relative"><Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" /><Input aria-label="Search results" className="h-8 w-[140px] bg-card pl-8 text-[10px] lg:w-[190px]" placeholder="Search results..." value={filter} onChange={e => setFilter(e.target.value)} /></div><Button variant="outline" size="sm" className="bg-card text-[10px]" onClick={() => copyJSON()}><Copy />Copy JSON</Button></div></div>
          <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-muted-foreground">Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> dari {display(pagination['total_items'])} {(platform === 'tv' || platform === 'radio') ? 'rekaman siaran' : post ? 'postingan' : 'profil'}{post && <> untuk <span className="font-semibold text-foreground">“{keyword}”</span></>}</p><span className="flex items-center gap-1.5 text-[9px] text-muted-foreground">{preview ? <><span className="status-dot text-instagram" />Data contoh · 0 kredit</> : viewingSaved ? <><Database size={11} className="text-primary" />Data tersimpan · 0 kredit baru</> : <><span className="status-dot text-primary" />Respons SocioAPI{syncedSearchId ? ' · Tersimpan' : ''}</>}</span></div>
          {loading ? <div role="status" className="empty-state"><Loader2 className="mx-auto mb-4 animate-spin text-primary" />Mencari {platform === 'tv' || platform === 'radio' ? 'rekaman siaran' : post ? 'postingan' : 'profil'} {platformName}…</div> : raw ? <pre className="raw-json">{JSON.stringify(preview ? result.payload : result, null, 2)}</pre> : filtered.length > 0 ? <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((item, i) => <ResultCard key={`${display(item['original_id'])}-${i}`} item={item} index={i} platform={platform} action={action} onInspect={setInspect} />)}</div> : <div className="empty-state"><Search className="mx-auto mb-3 text-muted-foreground" /><h3 className="text-sm font-semibold">{error ? 'Pencarian belum berhasil' : 'Tidak ada hasil ditemukan'}</h3><p className="mt-2 text-xs text-muted-foreground">{error ? 'Periksa pesan di atas dan coba kembali.' : filter ? 'Coba kata lain pada filter pencarian.' : !preview ? `${emptyResultsMessage(result.payload)} Request berhasil, tetapi tidak ada item untuk ditampilkan.` : 'Coba keyword atau akun lain.'}</p></div>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] text-muted-foreground">Page <span className="text-foreground">{currentPage}</span> of {display(totalPages)}</span><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="text-[10px]" disabled={loading || preview || items.length === 0 || currentPage <= 1} onClick={() => runSearch(currentPage - 1, '')}><ArrowLeft />Prev Page</Button><Button variant="outline" size="sm" className="text-[10px]" disabled={loading || preview || items.length === 0 || totalPages === null || currentPage >= totalPages} onClick={() => runSearch(currentPage + 1, '')}>Next Page<ArrowRight /></Button>{post && <Button variant="ghost" size="sm" className="text-[10px] text-primary" disabled={loading || preview || items.length === 0 || !nextCursor} onClick={() => { if (nextCursor) void runSearch(currentPage + 1, nextCursor); }}>Use Next Cursor<ArrowRight /></Button>}</div></div>
        </section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5"><span className="footer-note">SocioScope <span className="mx-2">/</span> Social Media Monitoring</span><span className="footer-note flex items-center gap-2"><ShieldCheck size={11} /> Powered by SocioAPI <span className="mx-1">·</span> v1.0</span></footer>
      </main>
    </div>
    <Dialog open={inspect !== null} onOpenChange={open => { if (!open) setInspect(null); }}><DialogContent className="max-w-2xl"><DialogTitle>Inspect Item JSON</DialogTitle><DialogDescription>Respons asli item {platformName}</DialogDescription><pre className="raw-json max-h-[60vh]">{JSON.stringify(inspect, null, 2)}</pre><Button variant="outline" onClick={() => copyJSON(inspect)}><Copy />Copy JSON</Button></DialogContent></Dialog>
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} user={user} onLovableSignIn={signIn} />
    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="max-w-2xl"><DialogTitle>Saved monitoring searches</DialogTitle><DialogDescription>Buka hasil tersimpan tanpa memanggil SocioAPI atau menggunakan kredit baru.</DialogDescription><div className="flex justify-end"><Button variant="ghost" size="sm" className="text-[10px]" disabled={historyLoading} onClick={() => void refreshHistory()}><RefreshCw className={historyLoading ? 'animate-spin' : ''} />Refresh</Button></div>{historyLoading && savedSearches.length === 0 ? <div role="status" className="py-10 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto mb-3 animate-spin text-primary" />Memuat riwayat tersimpan…</div> : savedSearches.length > 0 ? <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">{savedSearches.map(saved => <button type="button" key={saved.id} className="w-full rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/50" onClick={() => openSavedSearch(saved)}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[12px] font-semibold">{saved.platform.toUpperCase()} · {saved.action === 'search_post' ? 'Pencarian' : 'Profil'} · {savedQuery(saved)}</p><p className="mt-1.5 text-[10px] text-muted-foreground">{dateWIB(saved.created_at)} · {saved.result_count} hasil</p></div><span className="shrink-0 rounded border border-primary/20 bg-success-soft px-2 py-1 font-mono text-[9px] text-primary">{display(saved.credits_used)} kredit</span></div></button>)}</div> : <div className="rounded-md border border-dashed border-border py-10 text-center"><Database className="mx-auto mb-3 text-muted-foreground" /><p className="text-xs font-semibold">Belum ada pencarian tersimpan</p><p className="mt-2 text-[11px] text-muted-foreground">Pencarian berhasil dari semua platform akan tersimpan di riwayat akun Anda.</p></div>}</DialogContent></Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle>Bantuan SocioScope</DialogTitle><DialogDescription>Informasi pencarian dan data</DialogDescription><div className="space-y-4 text-sm text-muted-foreground"><p>Pilih TikTok, Instagram, Facebook, YouTube, Threads, X / Twitter, News, TV Broadcast, atau Radio Broadcast. News mendukung pencarian artikel berdasarkan keyword; platform sosial mengikuti dukungan Search Post dan Search Profile masing-masing; TV dan Radio memakai Broadcast Search.</p><p>Data contoh tidak menggunakan kredit. Pencarian nyata memerlukan akun dan menggunakan saldo SocioAPI.</p><p>N/A berarti data tidak tersedia. Engagement, views, dan reach ditampilkan secara terpisah. Waktu posting menggunakan WIB.</p></div></DialogContent></Dialog>
    <Dialog open={notifications} onOpenChange={setNotifications}><DialogContent><DialogTitle>Notifikasi</DialogTitle><DialogDescription>Aktivitas pencarian saat ini</DialogDescription><p className="py-5 text-sm text-muted-foreground">{error || (preview ? 'Belum ada aktivitas pencarian. Dashboard menampilkan data contoh.' : `Pencarian ${platformName} selesai dengan status HTTP ${result.http_status}.`)}</p></DialogContent></Dialog>
  </div>;
}
