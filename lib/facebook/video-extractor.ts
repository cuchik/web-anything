import { isAllowedFacebookMediaUrl } from "@/lib/facebook/url";

const embeddedVideoFields = [
  "browser_native_hd_url",
  "playable_url_quality_hd",
  "hd_src_no_ratelimit",
  "hd_src",
  "browser_native_sd_url",
  "playable_url",
  "sd_src_no_ratelimit",
  "sd_src",
  "progressive_url",
] as const;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeEmbeddedJsonString(value: string) {
  let current = decodeHtmlEntities(value);

  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const decoded = JSON.parse(`"${current}"`) as unknown;
      if (typeof decoded !== "string" || decoded === current) break;
      current = decodeHtmlEntities(decoded);
    } catch {
      current = current
        .replace(/\\u([0-9a-f]{4})/gi, (_, code: string) =>
          String.fromCharCode(Number.parseInt(code, 16)),
        )
        .replace(/\\\//g, "/");
      break;
    }
  }

  return current;
}

function createHtmlVariants(html: string) {
  const variants = [decodeHtmlEntities(html)];

  for (let pass = 0; pass < 2; pass += 1) {
    const current = variants.at(-1) ?? "";
    const flattened = current.replace(/\\"/g, '"');
    if (flattened === current) break;
    variants.push(flattened);
  }

  return variants;
}

/**
 * Facebook does not consistently publish og:video, but public page payloads may
 * contain progressive MP4 URLs in embedded JSON. These field names are
 * undocumented, so this extractor is deliberately isolated and optional.
 */
export function extractEmbeddedFacebookVideoUrl(html: string) {
  const variants = createHtmlVariants(html);

  for (const field of embeddedVideoFields) {
    const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `"${escapedField}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
      "g",
    );

    for (const variant of variants) {
      pattern.lastIndex = 0;
      for (const match of variant.matchAll(pattern)) {
        const rawValue = match[1];
        if (!rawValue) continue;

        try {
          const candidate = new URL(decodeEmbeddedJsonString(rawValue));
          if (isAllowedFacebookMediaUrl(candidate)) return candidate.toString();
        } catch {
          // Ignore malformed or non-URL values and continue to the next candidate.
        }
      }
    }
  }

  return undefined;
}
