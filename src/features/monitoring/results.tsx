import { Activity, Heart, MessageCircle, Share2, Eye, Radio, Code2, ExternalLink, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { display, metric, dateWIB, asRecord, profileMetricValues, type Item, type Platform, type Action } from './data';

export function ResultCard({ item, index, platform, action, onInspect }: { item: Item; index: number; platform: Platform; action: Action; onInspect: (item: Item) => void }) {
  const profile = action === 'search_profile';
  const author = asRecord(item['author']);
  const name = profile ? item['fullname'] ?? item['name'] : item['author_name'] ?? author['name'];
  const username = profile ? item['username'] : item['author_username'] ?? author['username'];
  const initials = display(name).split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const stats = asRecord(item['metrics']);
  const profileValues = profileMetricValues(item, platform);
  const tags = Array.isArray(item['hashtags']) ? item['hashtags'].map(String) : [];
  const avatar = profile ? item['avatar'] ?? item['profile_picture'] : item['author_avatar'];
  const images = Array.isArray(item['images']) ? item['images'].map(asRecord).filter(media => typeof media['original_url'] === 'string') : [];
  const videos = Array.isArray(item['videos']) ? item['videos'].map(asRecord).filter(media => typeof media['original_url'] === 'string') : [];
  const metricValues = profile ? [
    ['Followers', profileValues.followers, Eye], ['Following', profileValues.following, Radio], ['Likes/Fav', profileValues.likes, Heart], [platform === 'tiktok' ? 'Videos' : 'Posts', profileValues.posts, Activity],
  ] as const : [
    ['Engage', item['engagement'] ?? stats['engagement'], Activity], ['Likes', item['likes'] ?? stats['likes'], Heart], ['Comments', item['comments'] ?? stats['comments'], MessageCircle], ['Shares', item['shares'] ?? stats['shares'], Share2], ['Views', item['views'] ?? stats['views'], Eye], ['Reach', item['reach'] ?? stats['reach'], Radio],
  ] as const;
  const fallback = username && platform === 'instagram' ? `https://www.instagram.com/${username}/` : username && platform === 'tiktok' ? `https://www.tiktok.com/@${username}${!profile && item['original_id'] ? `/video/${item['original_id']}` : ''}` : undefined;
  const candidate = typeof item['url'] === 'string' ? item['url'] : fallback;
  const url = candidate && /^https:\/\//.test(candidate) ? candidate : undefined;
  return <article className="post-card">
    <div className="post-body">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`avatar ${index % 3 === 1 ? 'rose' : index % 3 === 2 ? 'neutral' : ''}`}>{typeof avatar === 'string' && /^https:\/\//.test(avatar) ? <img src={avatar} alt={`${display(name)} avatar`} className="h-full w-full rounded-full object-cover" /> : initials}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[13px] font-bold">{display(name)}</h3>{profile ? <span className={`flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[9px] ${item['verified'] || item['is_verified'] ? 'text-primary' : 'text-muted-foreground'}`}>{item['verified'] || item['is_verified'] ? <><BadgeCheck size={11} /> Verified</> : 'Standard'}</span> : <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{display(item['lang'])}</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{username ? `@${username}` : 'N/A'}</p></div>
        </div>
        {!profile && <time className="shrink-0 text-right text-[9px] text-muted-foreground">{dateWIB(item['published_at'])}</time>}
      </div>
      <p className="post-text whitespace-pre-line">{display(profile ? item['bio'] : item['title'] || item['text'])}</p>
      {!profile && images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{images.slice(0, 4).map((media, i) => <img key={String(media['id'] ?? i)} src={String(media['original_url'])} alt={String(media['caption'] ?? `Post image ${i + 1}`)} loading="lazy" className="max-h-64 w-full rounded-md border border-border object-cover" />)}</div>}
      {!profile && videos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{videos.map((media, i) => <a key={String(media['id'] ?? i)} href={String(media['original_url'])} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-[10px] text-primary"><ExternalLink size={12} />Buka video {i + 1}</a>)}</div>}
      {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{tags.map((tag, i) => <span key={`${tag}-${i}`} className="hashtag">#{tag.replace(/^#/, '')}</span>)}</div>}
      <div className={profile ? 'mt-5 grid grid-cols-2 gap-4 rounded-md border border-border bg-background p-4 sm:grid-cols-4' : 'metrics-grid'}>
        {metricValues.map(([label, value, Icon]) => <div className={profile ? '' : 'metric'} key={label}><div className="metric-label"><Icon />{label}</div><p className={`metric-value ${label === 'Engage' ? 'text-primary' : ''}`}>{metric(value)}</p></div>)}
      </div>
    </div>
    <div className="post-footer"><span className="max-w-[42%] truncate font-mono text-[9px] text-muted-foreground" title={display(item['original_id'])}>ID: {display(item['original_id'])}</span><div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground" title="Inspect Item JSON" aria-label={`Inspect JSON ${display(name)}`} onClick={() => onInspect(item)}><Code2 /> <span className="hidden sm:inline">Inspect JSON</span></Button>{url && <Button asChild variant="ghost" size="sm" className="text-[10px] text-primary"><a href={url} target="_blank" rel="noopener noreferrer">Buka di {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : platform === 'facebook' ? 'Facebook' : 'YouTube'} <ExternalLink /></a></Button>}</div></div>
  </article>;
}
