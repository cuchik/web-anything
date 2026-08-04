import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  analyzeMediaWithGemini,
  GEMINI_PROMPT_VERSION,
  shouldFallbackToThumbnail,
} from "@/lib/ai/gemini";
import { getCachedAnalysis, setCachedAnalysis } from "@/db/analysis-cache";
import { ApplicationError, toApplicationError } from "@/lib/errors/application-error";
import { fetchFacebookMetadata } from "@/lib/facebook/metadata";
import { parseFacebookVideoUrl, SAMPLE_IMAGE_URL, SAMPLE_VIDEO_URL } from "@/lib/facebook/url";
import { consumeRateLimit, getClientKey } from "@/lib/rate-limit";
import { logEvent } from "@/lib/observability/logger";
import type { RecipeAnalysis } from "@/lib/recipes/schema";

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2_048),
});

function jsonResponse(body: unknown, status: number, requestId: string, extraHeaders?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      ...extraHeaders,
    },
  });
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 4_096) {
    return jsonResponse(
      { error: { code: "REQUEST_TOO_LARGE", message: "Dữ liệu gửi lên quá lớn.", retryable: false, requestId } },
      413,
      requestId,
    );
  }

  const rateLimit = await consumeRateLimit(getClientKey(request.headers));
  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Bạn đã thử quá nhiều lần. Hãy đợi một chút rồi thử lại.",
          retryable: true,
          requestId,
        },
      },
      429,
      requestId,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (error) {
      throw new ApplicationError("INVALID_JSON", 400, "Dữ liệu gửi lên không đúng định dạng.", false, {
        cause: error,
      });
    }
    const parsedBody = requestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      throw new ApplicationError("INVALID_REQUEST", 400, "Hãy nhập một link Facebook hợp lệ.");
    }
    const body = parsedBody.data;
    const videoUrl = parseFacebookVideoUrl(body.url);
    const sourceUrl = videoUrl.toString();
    const cacheKey = `${GEMINI_PROMPT_VERSION}:${sourceUrl}`;
    const cachedRecipe = await getCachedAnalysis(cacheKey);
    if (cachedRecipe) {
      logEvent("info", "analysis.completed", {
        requestId,
        cached: true,
        durationMs: Date.now() - startedAt,
      });
      return jsonResponse({ recipe: cachedRecipe, requestId }, 200, requestId);
    }
    const isSample = videoUrl.toString() === SAMPLE_VIDEO_URL;
    const metadata = isSample
      ? { imageUrl: SAMPLE_IMAGE_URL, videoUrl: undefined, title: "", description: "" }
      : await fetchFacebookMetadata(videoUrl);

    let analysisMode: "video" | "thumbnail" = metadata.videoUrl ? "video" : "thumbnail";
    let recipe: RecipeAnalysis | undefined;
    if (metadata.videoUrl) {
      try {
        recipe = await analyzeMediaWithGemini({
          mediaUrl: metadata.videoUrl,
          mediaKind: "video",
          sourceTitle: metadata.title,
          sourceDescription: metadata.description,
        });
      } catch (error) {
        if (!shouldFallbackToThumbnail(error)) throw error;
        analysisMode = "thumbnail";
        logEvent("info", "analysis.video_fallback", { requestId });
      }
    }
    recipe ??= await analyzeMediaWithGemini({
      mediaUrl: metadata.imageUrl,
      mediaKind: "image",
      sourceTitle: metadata.title,
      sourceDescription: metadata.description,
    });

    if (analysisMode === "thumbnail") {
      recipe = {
        ...recipe,
        warnings: [
          "Facebook không cung cấp luồng video phù hợp; kết quả này dựa trên ảnh đại diện.",
          ...recipe.warnings,
        ].slice(0, 6),
      };
    }

    const responseRecipe = {
      ...recipe,
      analysisMode,
      image: metadata.imageUrl,
      sourceUrl,
      promptVersion: GEMINI_PROMPT_VERSION,
    };
    await setCachedAnalysis(cacheKey, responseRecipe);
    logEvent("info", "analysis.completed", {
      requestId,
      cached: false,
      durationMs: Date.now() - startedAt,
      confidenceBand: recipe.confidenceBand,
      analysisMode,
    });
    return jsonResponse({ recipe: responseRecipe, requestId }, 200, requestId);
  } catch (error) {
    const applicationError = toApplicationError(error);
    if (applicationError.status >= 500) {
      logEvent("error", "analysis.failed", {
        requestId,
        code: applicationError.code,
        retryable: applicationError.retryable,
        durationMs: Date.now() - startedAt,
      });
    }

    return jsonResponse(
      {
        error: {
          code: applicationError.code,
          message: applicationError.publicMessage,
          retryable: applicationError.retryable,
          requestId,
        },
      },
      applicationError.status,
      requestId,
    );
  }
}
