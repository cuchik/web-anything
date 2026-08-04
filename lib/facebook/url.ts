import { ApplicationError } from "@/lib/errors/application-error";

export const SAMPLE_VIDEO_URL = "https://www.facebook.com/reel/1234567890";
export const SAMPLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88";

export function isFacebookHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch";
}

export function isFacebookVideoUrl(url: URL) {
  if (url.protocol !== "https:" || !isFacebookHost(url.hostname)) return false;
  if (url.hostname.toLowerCase() === "fb.watch") return url.pathname !== "/";

  return (
    /^\/reel\/[^/]+/.test(url.pathname) ||
    /\/videos\/[^/]+/.test(url.pathname) ||
    (/^\/watch\/?$/.test(url.pathname) && url.searchParams.has("v")) ||
    /^\/share\/(?:r|v)\/[^/]+/.test(url.pathname)
  );
}

export function parseFacebookVideoUrl(value: string) {
  if (value.length > 2_048) {
    throw new ApplicationError(
      "INVALID_FACEBOOK_URL",
      400,
      "Link Facebook quá dài. Hãy kiểm tra lại link.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApplicationError(
      "INVALID_FACEBOOK_URL",
      400,
      "Link này chưa đúng định dạng. Bạn kiểm tra lại nhé.",
    );
  }

  if (url.username || url.password || !isFacebookVideoUrl(url)) {
    throw new ApplicationError(
      "INVALID_FACEBOOK_URL",
      400,
      "Link phải là video hoặc Reel công khai trên Facebook.",
    );
  }

  url.hash = "";
  return url;
}

export function isAllowedFacebookImageUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net") ||
      host === "fbsbx.com" ||
      host.endsWith(".fbsbx.com") ||
      isFacebookHost(host))
  );
}

export function isAllowedAnalysisImageUrl(url: URL) {
  return isAllowedFacebookImageUrl(url) ||
    (url.protocol === "https:" && url.hostname.toLowerCase() === "images.unsplash.com");
}
