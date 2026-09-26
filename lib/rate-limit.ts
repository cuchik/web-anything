import { ApplicationError } from "@/lib/errors/application-error";
import { getDatabase, getOptionalDatabase } from "@/db/client";
import { getServerConfig } from "@/lib/config/server";
import { hashAuthToken } from "@/lib/auth/token";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  now?: number;
};

const buckets = new Map<string, RateLimitBucket>();

function consumeMemoryRateLimit(key: string, options: Required<RateLimitOptions>) {
  for (const [entry, bucket] of buckets) {
    if (bucket.resetAt <= options.now) buckets.delete(entry);
  }
  const current = buckets.get(key);

  if (!current || current.resetAt <= options.now) {
    if (buckets.size >= 10_000) throw new ApplicationError("RATE_LIMIT_UNAVAILABLE", 503, "Hãy thử lại sau.", true);
    buckets.set(key, { count: 1, resetAt: options.now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - options.now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: options.limit - current.count, retryAfterSeconds: 0 };
}

async function consumeDatabaseRateLimit(
  database: D1Database,
  key: string,
  options: Required<RateLimitOptions>,
) {
  const nextResetAt = options.now + options.windowMs;
  const row = await database
    .prepare(`
      INSERT INTO api_rate_limits (key, count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
        reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
      RETURNING count, reset_at
    `)
    .bind(key, nextResetAt, options.now, options.now, nextResetAt)
    .first<{ count: number; reset_at: number }>();

  if (!row) throw new ApplicationError("RATE_LIMIT_UNAVAILABLE", 503, "Hãy thử lại sau.", true);
  const allowed = row.count <= options.limit;
  return {
    allowed,
    remaining: allowed ? Math.max(0, options.limit - row.count) : 0,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((row.reset_at - options.now) / 1_000)),
  };
}

export async function consumeRateLimit(key: string, partialOptions: RateLimitOptions = {}) {
  const options: Required<RateLimitOptions> = {
    limit: partialOptions.limit ?? 10,
    windowMs: partialOptions.windowMs ?? 10 * 60 * 1_000,
    now: partialOptions.now ?? Date.now(),
  };
  const database = getServerConfig().NODE_ENV === "production" ? await getDatabase() : await getOptionalDatabase();
  const opaqueKey = await hashAuthToken(key);
  if (database) return consumeDatabaseRateLimit(database, opaqueKey, options);
  return consumeMemoryRateLimit(opaqueKey, options);
}

export type RateLimitBudget = {
  key: string;
  limit: number;
  windowMs: number;
};

/** Applies every budget in order and rejects the request as soon as one is exhausted. */
export async function assertRateLimit(budgets: RateLimitBudget[]) {
  for (const budget of budgets) {
    const result = await consumeRateLimit(budget.key, {
      limit: budget.limit,
      windowMs: budget.windowMs,
    });
    if (!result.allowed) {
      throw new ApplicationError(
        "RATE_LIMITED",
        429,
        `Bạn đã thử quá nhiều lần. Hãy đợi khoảng ${result.retryAfterSeconds} giây rồi thử lại.`,
        true,
      );
    }
  }
}

export function getClientKey(headers: Headers) {
  const forwarded = headers.get("cf-connecting-ip");
  return forwarded?.trim() || "anonymous";
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
