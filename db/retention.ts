/** Bounded, opportunistic cleanup. Expired records are never authorized even before cleanup. */
export async function pruneExpiredData(database: D1Database, now = Date.now()) {
  await database.batch([
    database.prepare("DELETE FROM sessions WHERE id IN (SELECT id FROM sessions WHERE expires_at <= ? LIMIT 1000)").bind(now),
    database.prepare("DELETE FROM auth_tokens WHERE id IN (SELECT id FROM auth_tokens WHERE expires_at <= ? LIMIT 1000)").bind(now),
    database.prepare("DELETE FROM analysis_cache WHERE key IN (SELECT key FROM analysis_cache WHERE expires_at <= ? LIMIT 1000)").bind(now),
    database.prepare("DELETE FROM api_rate_limits WHERE key IN (SELECT key FROM api_rate_limits WHERE reset_at <= ? LIMIT 1000)").bind(now),
  ]);
}
