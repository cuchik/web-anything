import { ApplicationError } from "@/lib/errors/application-error";
import {
  isAllowedFacebookImageUrl,
  isAllowedFacebookMediaUrl,
  isFacebookHost,
} from "@/lib/facebook/url";
import { extractEmbeddedFacebookVideoUrls, facebookVideoId } from "@/lib/facebook/video-extractor";
import { decodeHtmlEntities } from "@/lib/facebook/html";
import { readTextWithLimit, safeFetch } from "@/lib/http/safe-fetch";

const maxHtmlBytes = 2 * 1024 * 1024;

export type FacebookMetadata = {
  imageUrl: string;
  videoUrl?: string;
  videoUrls: string[];
  title: string;
  description: string;
};

export function extractMetaContent(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return "";
}

export async function fetchFacebookMetadata(
  facebookVideoUrl: URL,
  fetchImplementation: typeof fetch = fetch,
): Promise<FacebookMetadata> {
  let response: Response;
  let resolvedUrl = facebookVideoUrl;
  try {
    response = await safeFetch(facebookVideoUrl, {
      isAllowedUrl: (url) => url.protocol === "https:" && !url.port && !url.username && !url.password && isFacebookHost(url.hostname),
      onFinalUrl: (url) => { resolvedUrl = url; },
      fetchImplementation,
      init: {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BepTuVideo/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(6_500),
      },
    });
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError(
      "FACEBOOK_UNAVAILABLE",
      502,
      "Không thể kết nối tới Facebook. Hãy thử lại sau.",
      true,
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new ApplicationError(
      "FACEBOOK_METADATA_FAILED",
      422,
      "Không thể đọc video Facebook này. Hãy kiểm tra video đang ở chế độ công khai.",
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType && !contentType.includes("text/html")) {
    throw new ApplicationError(
      "INVALID_FACEBOOK_RESPONSE",
      422,
      "Facebook không trả về một trang video hợp lệ.",
    );
  }

  const html = await readTextWithLimit(response, maxHtmlBytes);
  const requestedId = facebookVideoId(facebookVideoUrl);
  const resolvedId = facebookVideoId(resolvedUrl);
  let canonicalId: string | undefined;
  try { canonicalId = facebookVideoId(new URL(extractMetaContent(html, "og:url"))); } catch { /* Optional metadata. */ }
  const ids = [requestedId, resolvedId, canonicalId].filter(Boolean);
  if (new Set(ids).size > 1) {
    throw new ApplicationError("FACEBOOK_VIDEO_MISMATCH", 422, "Facebook trả về video khác với link đã nhập.");
  }
  const videoId = requestedId ?? resolvedId ?? canonicalId;
  const imageUrl = extractMetaContent(html, "og:image");
  if (!imageUrl) {
    throw new ApplicationError(
      "NO_FACEBOOK_IMAGE",
      422,
      "Không tìm thấy ảnh đại diện. Hãy kiểm tra video đang ở chế độ công khai.",
    );
  }

  let parsedImage: URL;
  try {
    parsedImage = new URL(imageUrl);
  } catch {
    throw new ApplicationError("INVALID_IMAGE_URL", 422, "Ảnh đại diện của video không hợp lệ.");
  }
  if (!isAllowedFacebookImageUrl(parsedImage)) {
    throw new ApplicationError(
      "UNSAFE_IMAGE_URL",
      422,
      "Ảnh đại diện nằm ngoài hệ thống Facebook được hỗ trợ.",
    );
  }

  const rawVideoUrl = ["og:video:secure_url", "og:video:url", "og:video"]
    .map((property) => extractMetaContent(html, property))
    .find(Boolean);
  let directVideoUrl: string | undefined;
  if (rawVideoUrl && videoId) {
    try {
      const parsedVideo = new URL(rawVideoUrl);
      if (isAllowedFacebookMediaUrl(parsedVideo)) directVideoUrl = parsedVideo.toString();
    } catch {
      // Video metadata is optional. A validated thumbnail remains a safe fallback.
    }
  }
  const embedded = extractEmbeddedFacebookVideoUrls(html, videoId);
  const videoUrls = [...new Set([directVideoUrl, ...embedded].filter((value): value is string => Boolean(value)))].slice(0, 2);

  return {
    imageUrl: parsedImage.toString(),
    videoUrl: videoUrls[0],
    videoUrls,
    title: extractMetaContent(html, "og:title").slice(0, 500),
    description: extractMetaContent(html, "og:description").slice(0, 1_500),
  };
}
