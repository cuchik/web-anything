import { ApplicationError } from "@/lib/errors/application-error";
import { isAllowedFacebookImageUrl, isFacebookHost } from "@/lib/facebook/url";
import { readTextWithLimit, safeFetch } from "@/lib/http/safe-fetch";

const maxHtmlBytes = 1024 * 1024;

export type FacebookMetadata = {
  imageUrl: string;
  title: string;
  description: string;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

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
  videoUrl: URL,
  fetchImplementation: typeof fetch = fetch,
): Promise<FacebookMetadata> {
  let response: Response;
  try {
    response = await safeFetch(videoUrl, {
      isAllowedUrl: (url) => url.protocol === "https:" && isFacebookHost(url.hostname),
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

  return {
    imageUrl: parsedImage.toString(),
    title: extractMetaContent(html, "og:title").slice(0, 500),
    description: extractMetaContent(html, "og:description").slice(0, 1_500),
  };
}
