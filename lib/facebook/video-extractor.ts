import { decodeHtmlEntities } from "@/lib/facebook/html";
import { isAllowedFacebookMediaUrl, isFacebookVideoUrl } from "@/lib/facebook/url";

const VIDEO_FIELDS = ["browser_native_hd_url", "playable_url_quality_hd", "hd_src_no_ratelimit", "hd_src",
  "browser_native_sd_url", "playable_url", "sd_src_no_ratelimit", "sd_src", "progressive_url"];

export function facebookVideoId(url: URL) {
  if (!isFacebookVideoUrl(url)) return undefined;
  const value = url.searchParams.get("v") ?? url.pathname.match(/\/(?:reel|videos)\/(\d+)(?:\/|$)/)?.[1];
  return value && /^\d+$/.test(value) ? value : undefined;
}

/** Fail closed: media must live inside the JSON object of the requested video.
 * Do not scan the whole page for the first URL; recommendation cards contain videos too.
 */
export function extractEmbeddedFacebookVideoUrls(html: string, videoId?: string): string[] {
  if (!videoId) return [];
  const candidates = new Map<string, string>();
  let remaining = 50_000;
  function visit(value: unknown, matched = false, depth = 0) {
    if (--remaining < 0 || depth > 60 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child, matched, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    const id = record.video_id ?? record.id;
    const scoped = id === undefined ? matched : String(id) === videoId;
    if (scoped) {
      for (const field of VIDEO_FIELDS) {
        if (typeof record[field] !== "string") continue;
        try {
          const url = new URL(decodeHtmlEntities(record[field]));
          if (isAllowedFacebookMediaUrl(url) && !candidates.has(field)) candidates.set(field, url.toString());
        } catch { /* Malformed media is not a candidate. */ }
      }
    }
    for (const child of Object.values(record)) visit(child, scoped, depth + 1);
  }
  for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    if (remaining < 0) break;
    try { visit(JSON.parse(script[1])); } catch { /* Never evaluate JavaScript. */ }
  }
  // One HD and one SD alternative, both tied to the same video id.
  const hd = VIDEO_FIELDS.slice(0, 4).map((field) => candidates.get(field)).find(Boolean);
  const sd = VIDEO_FIELDS.slice(4).map((field) => candidates.get(field)).find(Boolean);
  return [...new Set([hd, sd].filter((value): value is string => Boolean(value)))];
}

export function extractEmbeddedFacebookVideoUrl(html: string, videoId?: string) {
  return extractEmbeddedFacebookVideoUrls(html, videoId)[0];
}
