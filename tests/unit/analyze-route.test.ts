import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { ApplicationError } from "@/lib/errors/application-error";
import { logEvent } from "@/lib/observability/logger";

const mocks = vi.hoisted(() => ({ metadata: vi.fn(), analyze: vi.fn(), limit: vi.fn(), cache: vi.fn() }));
vi.mock("@/lib/facebook/metadata", () => ({ fetchFacebookMetadata: mocks.metadata }));
vi.mock("@/lib/ai/gemini", () => ({
  GEMINI_PROMPT_VERSION: "test-version", analyzeMediaWithGemini: mocks.analyze,
  shouldFallbackToThumbnail: (error: { code?: string }) => error.code === "VIDEO_DOWNLOAD_FAILED",
}));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: mocks.limit, assertRateLimit: vi.fn(), getClientKey: () => "test-client" }));
vi.mock("@/db/analysis-cache", () => ({ getCachedAnalysis: async () => null, setCachedAnalysis: mocks.cache }));
vi.mock("@/lib/observability/logger", () => ({ logEvent: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "https://app.example");
  mocks.limit.mockResolvedValue({ allowed: true });
  mocks.metadata.mockResolvedValue({ imageUrl: "https://scontent.fbcdn.net/dish.jpg", videoUrl: undefined, videoUrls: [], title: "", description: "" });
  mocks.analyze.mockResolvedValue({ title: "Dish", warnings: [], confidenceBand: "high" });
});
afterEach(() => vi.unstubAllEnvs());
const request = (url = "https://www.facebook.com/reel/123", origin = "https://app.example") => new NextRequest("https://app.example/api/analyze", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ url }),
});

describe("analysis route regression", () => {
  it("identifies missing D1 migrations without leaking the database error", async () => {
    mocks.limit.mockRejectedValue(new Error("D1_ERROR: no such table: api_rate_limits: SQLITE_ERROR"));
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ error: { code: "DATABASE_SCHEMA_MISSING", retryable: false } });
    expect(JSON.stringify(body)).not.toContain("api_rate_limits");
    expect(logEvent).toHaveBeenCalledWith("error", "analysis.failed", expect.objectContaining({
      stage: "rate_limit", code: "DATABASE_SCHEMA_MISSING", requestId: response.headers.get("X-Request-Id"),
    }));
    expect(mocks.metadata).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("fetches Facebook even for the old sample URL", async () => {
    const response = await POST(request("https://www.facebook.com/reel/1234567890"));
    expect(response.status).toBe(200);
    expect(mocks.metadata).toHaveBeenCalledOnce();
    expect(mocks.analyze.mock.calls[0]?.[0].mediaUrl).toBe("https://scontent.fbcdn.net/dish.jpg");
    expect(await response.json()).toMatchObject({ recipe: { analysisMode: "thumbnail" } });
  });
  it("uses same-video SD after HD transport failure", async () => {
    mocks.metadata.mockResolvedValue({ imageUrl: "https://scontent.fbcdn.net/dish.jpg", videoUrl: "https://video.fbcdn.net/hd", videoUrls: ["https://video.fbcdn.net/hd", "https://video.fbcdn.net/sd"], title: "", description: "" });
    mocks.analyze.mockRejectedValueOnce(new ApplicationError("VIDEO_DOWNLOAD_FAILED", 502, "failed"));
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ recipe: { analysisMode: "video" } });
    expect(mocks.analyze.mock.calls.map(([input]) => input.mediaUrl)).toEqual(["https://video.fbcdn.net/hd", "https://video.fbcdn.net/sd"]);
  });
  it("returns a bounded API error when the rate-limit database is unavailable", async () => {
    mocks.limit.mockRejectedValue(new ApplicationError("DATABASE_UNAVAILABLE", 503, "unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "DATABASE_UNAVAILABLE" } });
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("rejects another origin before database or provider work", async () => {
    expect((await POST(request(undefined, "https://evil.example"))).status).toBe(403);
    expect(mocks.limit).not.toHaveBeenCalled();
  });
});
