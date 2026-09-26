import { saveRecipeSchema, type SavedRecipePayload } from "@/lib/recipes/saved-recipe";
import { getOptionalDatabase as getDatabase } from "@/db/client";

type CacheRow = {
  response_json: string;
  expires_at: number;
};

async function hashKey(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getCachedAnalysis(sourceUrl: string): Promise<SavedRecipePayload | null> {
  const database = await getDatabase();
  if (!database) return null;

  const row = await database
    .prepare("SELECT response_json, expires_at FROM analysis_cache WHERE key = ?")
    .bind(await hashKey(sourceUrl))
    .first<CacheRow>();
  if (!row || row.expires_at <= Date.now()) return null;

  try {
    return saveRecipeSchema.parse(JSON.parse(row.response_json));
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(sourceUrl: string, recipe: SavedRecipePayload, ttlMs = 30 * 60 * 1_000) {
  const database = await getDatabase();
  if (!database) return;

  const responseJson = JSON.stringify(recipe);
  if (new TextEncoder().encode(responseJson).byteLength > 24_000) return;
  const now = Date.now();
  await database
    .prepare(`
      INSERT INTO analysis_cache (key, response_json, expires_at, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        response_json = excluded.response_json,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
    `)
    .bind(await hashKey(sourceUrl), responseJson, now + ttlMs, now)
    .run();
}
