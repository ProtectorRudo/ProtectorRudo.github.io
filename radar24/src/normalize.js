const count = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate !== '') {
      const n = Number(candidate);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
  }
  return 0;
};
function timestamp(input) {
  if (input == null || input === '') return null;
  const n = Number(input);
  const ms = Number.isFinite(n) && String(input).length <= 13 ? (n < 1e11 ? n * 1000 : n) : Date.parse(String(input));
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return !Number.isNaN(d.valueOf()) ? d.toISOString() : null;
}
function safeVideoUrl(raw, platform) {
  try {
    const url = new URL(String(raw));
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const allowed = platform === 'tiktok' ? ['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'] : ['www.instagram.com', 'instagram.com'];
    if (!allowed.includes(host)) return null;
    if (platform === 'tiktok' && !/\/video\/[0-9]+/.test(url.pathname)) return null;
    if (platform === 'instagram' && !/^\/(reel|p)\/[^/]+/.test(url.pathname)) return null;
    return url.origin + url.pathname;
  } catch { return null; }
}
function safeImage(raw) {
  try { const url = new URL(raw); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
export function normalizeTikTok(v, market = 'AR') {
  if (!v || typeof v !== 'object') return null;
  const author = v.authorMeta || {};
  const id = String(v.id || v.aweme_id || v.videoId || '');
  const handle = String(author.name || author.uniqueId || v.author?.uniqueId || '').replace(/^@/, '');
  const url = safeVideoUrl(v.webVideoUrl || v.url || `https://www.tiktok.com/@${encodeURIComponent(handle)}/video/${id}`, 'tiktok');
  const postedAt = timestamp(v.createTimeISO || v.createTime || v.create_time || v.timestamp);
  if (!id || !url || !postedAt) return null;
  return { id: 'tiktok:' + id, platform: 'tiktok', externalId: id, url, postedAt, author: handle || 'Creador',
    caption: String(v.text || v.desc || '').slice(0, 1500), thumbnail: safeImage(v.videoMeta?.coverUrl || v.coverUrl || v.video?.cover),
    views: count(v.playCount, v.stats?.playCount, v.stats?.play_count), likes: count(v.diggCount, v.stats?.diggCount, v.stats?.likeCount),
    comments: count(v.commentCount, v.stats?.commentCount), shares: count(v.shareCount, v.stats?.shareCount),
    followers: count(author.fans, author.followerCount), market, };
}
export function normalizeInstagram(v, market = 'AR') {
  if (!v || typeof v !== 'object') return null;
  const code = String(v.shortCode || v.shortcode || v.code || '');
  const type = String(v.type || v.productType || '').toLowerCase();
  const rawUrl = v.url || v.permalink || (code ? `https://www.instagram.com/reel/${code}/` : '');
  const url = safeVideoUrl(rawUrl, 'instagram');
  if (!url || (type && !['video', 'reel', 'clips'].includes(type) && !url.includes('/reel/'))) return null;
  const postedAt = timestamp(v.timestamp || v.takenAtTimestamp || v.taken_at || v.createdAt);
  if (!postedAt) return null;
  const externalId = code || url.split('/').filter(Boolean).at(-1);
  return { id: 'instagram:' + externalId, platform: 'instagram', externalId, url, postedAt,
    author: String(v.ownerUsername || v.owner?.username || 'Creador'), caption: String(v.caption || '').slice(0, 1500),
    thumbnail: safeImage(v.displayUrl || v.thumbnailUrl || v.imageUrl),
    views: count(v.videoViewCount, v.videoPlayCount, v.playCount, v.viewCount),
    likes: count(v.likesCount, v.likeCount), comments: count(v.commentsCount, v.commentCount),
    shares: count(v.sharesCount, v.shareCount), followers: count(v.ownerFollowersCount, v.owner?.followersCount), market };
}
export { timestamp, safeVideoUrl };
