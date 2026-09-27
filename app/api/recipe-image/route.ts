import { exportImageSchema, fetchExportImage } from "@/lib/facebook/export-image";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/http/request-origin";
import { assertRateLimit, getClientKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = exportImageSchema.safeParse(await readJsonBody(request, 4096));
    if (!parsed.success) throw new ApplicationError("INVALID_IMAGE", 400, "Ảnh không thuộc nguồn được hỗ trợ.");
    await assertRateLimit([
      { key: `recipe-image:${getClientKey(request.headers)}`, limit: 30, windowMs: 600_000 },
      { key: "recipe-image:global", limit: 300, windowMs: 600_000 },
    ]);
    const { bytes, type } = await fetchExportImage(parsed.data.image);
    return new Response(bytes, { headers: {
      "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
