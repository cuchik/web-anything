/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "@/lib/http/security-headers";
import { pruneExpiredData } from "@/db/retention";
import { logEvent } from "@/lib/observability/logger";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (env.DB && Date.now() >= nextRetentionAt) {
      nextRetentionAt = Date.now() + 60 * 60 * 1_000;
      ctx.waitUntil(pruneExpiredData(env.DB).catch(() => {
        logEvent("warn", "retention.failed", { code: "DATABASE_ERROR" });
      }));
    }

    try {
      if (url.pathname === "/_vinext/image") {
        const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
        const response = await handleImageOptimization(request, {
          fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
            return result.response();
          },
        }, allowedWidths);
        return withSecurityHeaders(response, url.protocol === "https:");
      }

      return withSecurityHeaders(await handler.fetch(request, env, ctx), url.protocol === "https:");
    } catch {
      logEvent("error", "worker.request_failed", { code: "UNHANDLED_ERROR" });
      return withSecurityHeaders(new Response("Ứng dụng tạm thời không khả dụng.", {
        status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
      }), url.protocol === "https:");
    }
  },
};

let nextRetentionAt = 0;

export default worker;
