import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useState, type ReactNode } from 'react';
import { Activity, ArrowUpRight, ArrowRight, ArrowLeft, Bell, Check, ChevronRight, CircleHelp, Code2, Coins, Copy, FileText, Globe2, Instagram, LayoutDashboard, Loader2, Music2, Search, ShieldCheck, UserRound, Users, Zap, Clock3, Layers, Hash, Radio, Youtube, Facebook, AtSign, Newspaper, CheckCircle2, LogOut } from 'lucide-react';
import { LovableMark } from '@lovable.dev/cloud-auth-js/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { searchSocioAPI } from '@/features/monitoring/search.functions';
import { ResultCard } from '@/features/monitoring/results';
import { asRecord, display, getItems, numberValue, creditsUsed, previewResult, httpError, type Platform, type Action, type ApiResult, type Item } from '@/features/monitoring/data';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'SocioScope — Social Media Monitoring' },
    { name: 'description', content: 'Cari postingan dan profil TikTok serta Instagram. Pantau percakapan, engagement, dan kredit SocioAPI dalam satu dashboard.' },
    { property: 'og:title', content: 'SocioScope — Social Media Monitoring' },
    { property: 'og:description', content: 'Dashboard monitoring multi-platform untuk pencarian postingan dan profil TikTok serta Instagram.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="min-w-0"><span className="field-label">{label}</span>{children}</label>; }
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
  const [history, setHistory] = useState<Record<Platform, string[]>>({ tiktok: [], instagram: [] });
  const [filter, setFilter] = useState(''); const [raw, setRaw] = useState(false);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [inspect, setInspect] = useState<Item | null>(null);
  const [help, setHelp] = useState(false); const [notifications, setNotifications] = useState(false);
  const [user, setUser] = useState<string | null>(null); const [authOpen, setAuthOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const searchAPI = useServerFn(searchSocioAPI);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setUser(data.session?.user.email ?? data.session?.user.id ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user.email ?? session?.user.id ?? null); });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  const platformName = platform === 'tiktok' ? 'TikTok' : 'Instagram';
  const post = action === 'search_post';
  const pagination = asRecord(result.payload['pagination']);
  const currentPage = numberValue(pagination['current_page']) ?? page;
  const totalPages = numberValue(pagination['total_pages']);
  const nextCursor = typeof pagination['next_cursor'] === 'string' && pagination['next_cursor'] ? pagination['next_cursor'] : null;
  const items = getItems(result.payload);
  const filtered = items.filter(item => JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));
  const used = creditsUsed(result);
  function changeMode(p: Platform, a: Action) {
    setPlatform(p); setAction(a); setPage(1); setCursor(''); setFilter(''); setError(''); setRaw(false);
    setPreview(true); setResult(previewResult(p, a));
  }
  async function signIn() {
    const response = await lovable.auth.signInWithOAuth('lovable', { redirect_uri: window.location.origin });
    if (response.error) toast.error('Tidak dapat masuk. Silakan coba kembali.');
    else if (!response.redirected) { setAuthOpen(false); toast.success('Berhasil masuk. Anda dapat menjalankan pencarian.'); }
  }
  async function runSearch(targetPage = page, targetCursor = cursor) {
    if (post && !keyword.trim()) { setError('Keyword / Hashtag wajib diisi.'); return; }
    if (!post && !username.trim() && !name.trim()) { setError('Isi Username atau Name untuk mencari profil.'); return; }
    if (start && end && start > end) { setError('Start Date tidak boleh setelah End Date.'); return; }
    if (!user) { setAuthOpen(true); return; }
    setLoading(true); setError('');
    try {
      const params = post ? { keyword, start_date: start, end_date: end, sort_by: sortBy, sort_order: sortOrder, page: String(targetPage), cursor: targetCursor } : { username, name, page: String(targetPage), size: String(size) };
      const wire = await searchAPI({ data: { platform, action, params } });
      const response: ApiResult = { http_status: wire.http_status, payload: asRecord(JSON.parse(wire.payloadJSON)) };
      setResult(response); setPreview(false); setPage(targetPage); setCursor(targetCursor);
      const remaining = numberValue(asRecord(response.payload['billing'])['remaining_credits']);
      if (remaining !== null) setCredits(remaining);
      if (response.http_status !== 200) setError(httpError(response.http_status));
      else {
        if (!post && username.trim()) setHistory(old => ({ ...old, [platform]: [username.trim(), ...old[platform].filter(u => u !== username.trim())].slice(0, 5) }));
        toast.success(`${getItems(response.payload).length} ${post ? 'postingan' : 'profil'} diterima`);
      }
    } catch { setError('Pencarian gagal. Periksa koneksi atau masuk kembali, lalu coba lagi.'); }
    finally { setLoading(false); }
  }
  async function copyJSON(value: unknown = result.payload) {
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
        <section className="mt-8" aria-label="Platform coverage"><div className="flex items-center gap-2"><Globe2 size={12} className="text-muted-foreground" /><h2 className="section-caption">Platform coverage</h2><span className="text-[9px] text-muted-foreground">2 connected platforms</span></div><div className="platform-row">
          <Button variant="ghost" className={`platform-button ${platform === 'tiktok' ? 'selected' : ''}`} onClick={() => changeMode('tiktok', action)} disabled={loading}><Music2 /><span className="text-[12px] font-bold">TikTok</span><span className={`ml-2 flex items-center gap-1.5 text-[9px] ${platform === 'tiktok' ? 'text-primary' : 'text-muted-foreground'}`}><span className="status-dot" /> Step 1 • Active</span></Button>
          <Button variant="ghost" className={`platform-button ${platform === 'instagram' ? 'selected' : ''}`} onClick={() => changeMode('instagram', action)} disabled={loading}><Instagram className="text-instagram" /><span className="text-[12px] font-bold">Instagram</span><span className="ml-2 text-[9px] text-muted-foreground">Step 2 • Ready</span></Button>
          <div className="mx-1 hidden h-6 border-l border-border xl:block" />
          {[[AtSign, 'X / Twitter'], [Facebook, 'Facebook'], [Youtube, 'YouTube'], [AtSign, 'Threads'], [Newspaper, 'News'], [Radio, 'TV & Radio']].map(([Icon, text]) => { const Symbol = Icon as typeof AtSign; return <span key={String(text)} className="flex items-center gap-1.5 rounded border border-border/70 px-2.5 py-2 text-[10px] text-muted-foreground/65"><Symbol size={12} />{String(text)}</span>; })}
        </div></section>
        <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Search endpoints">
          <Button variant="ghost" className={`endpoint-card ${post ? 'selected' : ''}`} disabled={loading} onClick={() => changeMode(platform, 'search_post')}><span className="endpoint-icon"><FileText /></span><span className="ml-1 flex-1"><span className="block text-[13px] font-bold">1. {platformName} Search Post API</span><span className="mt-1.5 block text-[10px] text-muted-foreground">Telusuri postingan berdasarkan keyword atau hashtag</span></span>{post ? <CheckCircle2 className="text-primary" /> : <ArrowUpRight className="text-muted-foreground" />}</Button>
          <Button variant="ghost" className={`endpoint-card ${!post ? 'selected' : ''}`} disabled={loading} onClick={() => changeMode(platform, 'search_profile')}><span className="endpoint-icon"><UserRound /></span><span className="ml-1 flex-1"><span className="block text-[13px] font-bold">2. {platformName} Search Profile API</span><span className="mt-1.5 block text-[10px] text-muted-foreground">Temukan profil dan statistik akun media sosial</span></span>{!post ? <CheckCircle2 className="text-primary" /> : <ArrowUpRight className="text-muted-foreground" />}</Button>
        </section>
        <section className="mt-7 border-b border-border pb-7" aria-label="Form pencarian"><form onSubmit={event => { event.preventDefault(); void runSearch(); }}>
          {post ? <><div className="flex items-end gap-3"><div className="min-w-0 flex-1"><Field label="Keyword / Hashtag *"><div className="relative"><Hash size={15} className="absolute left-3.5 top-3.5 text-muted-foreground" /><Input aria-label="Keyword / Hashtag" className="search-input pl-10" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Masukkan keyword atau hashtag" /></div></Field></div><Button type="submit" className="h-[43px] px-5 text-[11px]" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />}<span className="hidden sm:inline">Run Search Post</span><span className="sm:hidden">Search</span></Button></div>
          <div className="filter-grid mt-5"><Field label="Start Date"><Input aria-label="Start Date" className="search-input h-10" type="date" value={start} onChange={e => setStart(e.target.value)} /></Field><Field label="End Date"><Input aria-label="End Date" className="search-input h-10" type="date" value={end} onChange={e => setEnd(e.target.value)} /></Field><Field label="Sort By"><select aria-label="Sort By" className="select-input" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="time">Time</option><option value="engagement">Engagement</option></select></Field><Field label="Sort Order"><select aria-label="Sort Order" className="select-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></Field><Field label="Page"><Input aria-label="Page" className="search-input h-10 font-mono" type="number" min={1} value={page} onChange={e => setPage(Math.max(1, Number(e.target.value)))} /></Field><Field label="Cursor"><Input aria-label="Cursor" className="search-input h-10 font-mono" value={cursor} onChange={e => setCursor(e.target.value)} placeholder="Optional cursor" /></Field></div></> : <><div className="grid grid-cols-2 items-end gap-4 lg:grid-cols-[2fr_2fr_.6fr_.6fr_auto]"><Field label="Username"><Input aria-label="Username" className="search-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="contoh: nadiaputri" /></Field><Field label="Name"><Input aria-label="Name" className="search-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nama profil" /></Field><Field label="Page"><Input aria-label="Page" className="search-input" type="number" min={1} value={page} onChange={e => setPage(Math.max(1, Number(e.target.value)))} /></Field><Field label="Size"><Input aria-label="Size" className="search-input" type="number" min={1} max={100} value={size} onChange={e => setSize(Math.min(100, Math.max(1, Number(e.target.value))))} /></Field><Button type="submit" className="h-[43px] text-[11px]" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />}Run Search Profile</Button></div>{history[platform].length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[10px] text-muted-foreground">Riwayat akun</span>{history[platform].map(account => <Button key={account} size="sm" variant="secondary" type="button" onClick={() => setUsername(account)}>@{account}</Button>)}</div>}</>}
        </form>{error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><CircleHelp size={15} className="shrink-0" />{error}</div>}</section>
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan pencarian">
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Total {post ? 'Postingan' : 'Profil'} Ditemukan</span><FileText size={14} /></div><div className="kpi-number">{display(pagination['total_items'])}</div><p className="mt-2 text-[9px] text-muted-foreground">{post ? 'Postingan' : 'Profil'} dari hasil pencarian</p></div>
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Total Halaman</span><Layers size={14} /></div><div className="kpi-number">{display(pagination['current_page'])}<span className="ml-2 text-[11px] font-normal text-muted-foreground">current page</span></div><p className="mt-2 text-[9px] text-muted-foreground">{display(pagination['page_size'])} items per page</p></div>
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Total Seluruh Halaman</span><Copy size={14} /></div><div className="kpi-number">{display(pagination['total_pages'])}</div><p className="mt-2 text-[9px] text-muted-foreground">Halaman tersedia</p></div>
          <div className="kpi-card"><div className="flex justify-between gap-2 text-[10px] text-muted-foreground"><span>Status HTTP & Latensi</span><Activity size={14} /></div><div className={`mt-4 flex items-center gap-2 text-[22px] font-semibold ${result.http_status === 200 ? 'text-primary' : 'text-destructive'}`}><span className="status-dot" />{preview ? 'Preview' : `${result.http_status} ${result.http_status === 200 ? 'OK' : 'Error'}`}</div><p className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground"><Clock3 size={10} />{display(asRecord(result.payload['time'])['value'])}{asRecord(result.payload['time'])['value'] != null ? ' ms' : ''}<span className="mx-1">·</span>{display(used)} kredit terpakai</p></div>
        </section>
        <section className="mt-8" id="results" aria-label="Hasil pencarian"><div className="results-heading"><div className="view-tabs"><Button variant="ghost" className={`view-tab ${!raw ? 'selected' : ''}`} onClick={() => setRaw(false)}><FileText />{post ? 'Postingan' : 'Profile'} {platformName}<span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{items.length}</span></Button><Button variant="ghost" className={`view-tab ${raw ? 'selected' : ''}`} onClick={() => setRaw(true)}><Code2 /><span className="hidden sm:inline">Raw JSON Response</span><span className="sm:hidden">JSON</span></Button></div><div className="flex items-center gap-3"><div className="relative"><Search size={12} className="absolute left-2.5 top-2.5 text-muted-foreground" /><Input aria-label="Search results" className="h-8 w-[140px] bg-card pl-8 text-[10px] lg:w-[190px]" placeholder="Search results..." value={filter} onChange={e => setFilter(e.target.value)} /></div><Button variant="outline" size="sm" className="bg-card text-[10px]" onClick={() => copyJSON()}><Copy />Copy JSON</Button></div></div>
          <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-muted-foreground">Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> dari {display(pagination['total_items'])} {post ? 'postingan' : 'profil'}{post && <> untuk <span className="font-semibold text-foreground">“{keyword}”</span></>}</p><span className="flex items-center gap-1.5 text-[9px] text-muted-foreground">{preview ? <><span className="status-dot text-instagram" />Data contoh · 0 kredit</> : <><span className="status-dot text-primary" />Respons SocioAPI</>}</span></div>
          {loading ? <div role="status" className="empty-state"><Loader2 className="mx-auto mb-4 animate-spin text-primary" />Mencari {post ? 'postingan' : 'profil'} {platformName}…</div> : raw ? <pre className="raw-json">{JSON.stringify(result.payload, null, 2)}</pre> : filtered.length > 0 ? <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((item, i) => <ResultCard key={`${display(item['original_id'])}-${i}`} item={item} index={i} platform={platform} action={action} onInspect={setInspect} />)}</div> : <div className="empty-state"><Search className="mx-auto mb-3 text-muted-foreground" /><h3 className="text-sm font-semibold">{error ? 'Pencarian belum berhasil' : 'Tidak ada hasil ditemukan'}</h3><p className="mt-2 text-xs text-muted-foreground">{error ? 'Periksa pesan di atas dan coba kembali.' : filter ? 'Coba kata lain pada filter pencarian.' : 'Coba keyword atau akun lain. Hasil kosong tidak menggunakan kredit.'}</p></div>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] text-muted-foreground">Page <span className="text-foreground">{currentPage}</span> of {display(totalPages)}</span><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="text-[10px]" disabled={loading || preview || currentPage <= 1} onClick={() => runSearch(currentPage - 1, '')}><ArrowLeft />Prev Page</Button><Button variant="outline" size="sm" className="text-[10px]" disabled={loading || preview || totalPages === null || currentPage >= totalPages} onClick={() => runSearch(currentPage + 1, '')}>Next Page<ArrowRight /></Button>{post && <Button variant="ghost" size="sm" className="text-[10px] text-primary" disabled={loading || preview || !nextCursor} onClick={() => { if (nextCursor) void runSearch(currentPage + 1, nextCursor); }}>Use Next Cursor<ArrowRight /></Button>}</div></div>
        </section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5"><span className="footer-note">SocioScope <span className="mx-2">/</span> Social Media Monitoring</span><span className="footer-note flex items-center gap-2"><ShieldCheck size={11} /> Powered by SocioAPI <span className="mx-1">·</span> v1.0</span></footer>
      </main>
    </div>
    <Dialog open={inspect !== null} onOpenChange={open => { if (!open) setInspect(null); }}><DialogContent className="max-w-2xl"><DialogTitle>Inspect Item JSON</DialogTitle><DialogDescription>Respons asli item {platformName}</DialogDescription><pre className="raw-json max-h-[60vh]">{JSON.stringify(inspect, null, 2)}</pre><Button variant="outline" onClick={() => copyJSON(inspect)}><Copy />Copy JSON</Button></DialogContent></Dialog>
    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent><DialogTitle>{user ? 'Akun workspace' : 'Masuk ke SocioScope'}</DialogTitle><DialogDescription>{user ? user : 'Masuk untuk menjalankan pencarian SocioAPI dengan aman.'}</DialogDescription>{user ? <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); setAuthOpen(false); setCredits(null); }}><LogOut />Keluar</Button> : <Button variant="outline" onClick={signIn}><LovableMark />Lanjutkan dengan Lovable</Button>}</DialogContent></Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogTitle>Bantuan SocioScope</DialogTitle><DialogDescription>Informasi pencarian dan data</DialogDescription><div className="space-y-4 text-sm text-muted-foreground"><p>Pilih TikTok atau Instagram, lalu cari postingan dengan keyword atau profil dengan username/nama.</p><p>Data contoh tidak menggunakan kredit. Pencarian nyata memerlukan akun dan menggunakan saldo SocioAPI.</p><p>N/A berarti data tidak tersedia. Engagement, views, dan reach ditampilkan secara terpisah. Waktu posting menggunakan WIB.</p></div></DialogContent></Dialog>
    <Dialog open={notifications} onOpenChange={setNotifications}><DialogContent><DialogTitle>Notifikasi</DialogTitle><DialogDescription>Aktivitas pencarian saat ini</DialogDescription><p className="py-5 text-sm text-muted-foreground">{error || (preview ? 'Belum ada aktivitas pencarian. Dashboard menampilkan data contoh.' : `Pencarian ${platformName} selesai dengan status HTTP ${result.http_status}.`)}</p></DialogContent></Dialog>
  </div>;
}
