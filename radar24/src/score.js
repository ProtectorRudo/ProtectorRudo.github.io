function bounded(v, cap) { return Math.min(1, Math.max(0, v / cap)); }
function safeNumber(x) { return Number.isFinite(x) ? x : 0; }
export function enrich(video, snapshots, now = new Date()) {
  const ts = +now;
  const ageHours = Math.max(.01, (ts - Date.parse(video.postedAt)) / 36e5);
  const sorted = [...snapshots].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const last = sorted.at(-1) || { observedAt: now.toISOString(), views: video.views, likes: video.likes, comments: video.comments, shares: video.shares };
  const last24 = sorted.filter(s => ts - Date.parse(s.observedAt) <= 86400000);
  const old = last24.length >= 2 ? last24[0] : null;
  const hoursObserved = old ? (+new Date(last.observedAt) - +new Date(old.observedAt)) / 36e5 : 0;
  const gained = old && hoursObserved >= 1/60 ? Math.max(0, last.views - old.views) : null;
  const velocity = gained !== null ? gained / hoursObserved : null;
  const rate = (last.likes + 2 * last.comments + 3 * last.shares) / Math.max(1, last.views);
  const recentViewsPerHour = last.views / Math.max(1, ageHours);
  // A boost only counts as acceleration with three separate checkpoints.
  let acceleration = null;
  if (last24.length >= 3) {
    const a = last24.at(-3), b = last24.at(-2), c = last24.at(-1);
    const dt1 = (+new Date(b.observedAt) - +new Date(a.observedAt)) / 36e5;
    const dt2 = (+new Date(c.observedAt) - +new Date(b.observedAt)) / 36e5;
    if (dt1 >= 1/60 && dt2 >= 1/60) {
      const v1 = Math.max(0, b.views - a.views) / dt1;
      const v2 = Math.max(0, c.views - b.views) / dt2;
      if (v1 > 0) acceleration = (v2 / v1 - 1) * 100;
    }
  }
  const relative = video.followers ? last.views / video.followers : null;
  // Log scaling values strong view velocity, while retaining measurable social
  // engagement; weak posts cannot lead solely on an extreme like percentage.
  const logScore = (value, reference) => Math.min(1, Math.log1p(Math.max(0,value))/Math.log1p(reference));
  const sharesPerView = last.shares / Math.max(1,last.views);
  const rawEngagement = (last.likes + last.comments + last.shares)/Math.max(1,last.views);
  const score = Math.round(100 * (
    .36 * logScore(velocity === null ? recentViewsPerHour : velocity, 30000) +
    .24 * logScore(last.views, 500000) +
    .18 * bounded(rawEngagement, .12) +
    .10 * bounded(sharesPerView, .02) +
    .07 * bounded(safeNumber(relative),5) +
    .05 * (acceleration === null ? 0 : bounded(Math.max(0,acceleration),150))
  ));
  const quality = ((last.views >= 10000 && score >= 50) || (last.views >= 100000 && score >= 40))
    ? 'destacado' : last.views >= 3000 && score >= 36 ? 'prometedor' : 'en observación';
  const confidence = last24.length >= 3 && hoursObserved >= 2 ? 'alta' : (last24.length >= 2 && hoursObserved >= .5 ? 'media' : 'inicial');
  const new24 = ageHours <= 24 && ageHours >= 0;
  const accelerated24 = !new24 && velocity !== null && acceleration !== null && acceleration >= 50 && gained >= 100;
  return {
    ...video, score, quality, confidence, ageHours: Math.round(ageHours * 10) / 10,
    new24, accelerated24, viewsGained: gained, observedHours: Math.round(hoursObserved * 10) / 10,
    velocity: velocity === null ? null : Math.round(velocity),
    acceleration: acceleration === null ? null : Math.round(acceleration),
    engagementRate: Math.round(rate * 1000) / 10,
    status: confidence === 'inicial' ? 'En observación' : acceleration !== null && acceleration >= 50 ? 'Acelerando' : 'Creciendo',
    lastObservedAt: last.observedAt,
  };
}
