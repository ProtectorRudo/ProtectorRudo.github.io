import { resolve } from 'node:path';
const clamp = (n, min, max, fallback) => Number.isFinite(+n) ? Math.min(max, Math.max(min, +n)) : fallback;
function tokens(text, fallback, max = 8) {
  return String(text ?? fallback).split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, max);
}
export function config(env = process.env) {
  return {
    port: clamp(env.PORT, 1, 65535, 3000),
    dbPath: resolve(env.RADAR_DB_PATH || './data/radar.sqlite'),
    adminKey: String(env.RADAR_ADMIN_KEY || ''),
    apifyToken: String(env.APIFY_TOKEN || ''),
    openAiKey: String(env.OPENAI_API_KEY || ''),
    openAiModel: String(env.OPENAI_MODEL || 'gpt-4.1-mini'),
    autoScan: env.RADAR_AUTO_SCAN === 'true',
    pollMinutes: clamp(env.RADAR_POLL_MINUTES, 60, 1440, 360),
    perQuery: clamp(env.RADAR_RESULTS_PER_QUERY, 1, 50, 20),
    exploreEnabled: env.RADAR_TIKTOK_EXPLORE === 'true',
    explorePerCategory: clamp(env.RADAR_EXPLORE_PER_CATEGORY, 1, 35, 20),
    maxRunsPerDay: clamp(env.RADAR_MAX_RUNS_PER_DAY, 1, 12, 4),
    tiktokQueries: tokens(env.RADAR_TIKTOK_QUERIES, 'humor argentino,curiosidades,antes y despues,tendencias virales', 4),
    instagramTags: tokens(env.RADAR_INSTAGRAM_TAGS, 'reelsargentina,humorargentino,curiosidades', 4),
    market: String(env.RADAR_MARKET || 'AR'),
  };
}
