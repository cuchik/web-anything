import { z } from "zod";
import { ApplicationError } from "@/lib/errors/application-error";
import { isAllowedFacebookImageUrl, SAMPLE_IMAGE_URL } from "@/lib/facebook/url";
import { safeFetch, readBytesWithLimit } from "@/lib/http/safe-fetch";

// The exact existing demo asset is allowed only for explicitly labelled previews.
function allowedImage(url: URL) {
  return isAllowedFacebookImageUrl(url) || url.href === SAMPLE_IMAGE_URL;
}

export const exportImageSchema = z.object({
  image: z.string().url().max(2048).refine((value) => {
    try { return allowedImage(new URL(value)); } catch { return false; }
  }),
});

export async function fetchExportImage(image: string, fetchImplementation: typeof fetch = fetch) {
  const response = await safeFetch(image, {
    isAllowedUrl: allowedImage,
    fetchImplementation,
    init: { signal: AbortSignal.timeout(8_000), headers: { Accept: "image/jpeg,image/png,image/webp" } },
  });
  const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!response.ok || !type || !["image/jpeg", "image/png", "image/webp"].includes(type)) {
    await response.body?.cancel();
    throw new ApplicationError("IMAGE_UNAVAILABLE", 422, "Không tải được ảnh từ video. Ảnh có thể đã hết hạn.");
  }
  const bytes = await readBytesWithLimit(response, 5 * 1024 * 1024);
  if (!bytes.byteLength) throw new ApplicationError("IMAGE_UNAVAILABLE", 422, "Ảnh từ video không còn khả dụng.");
  return { bytes, type };
}
