import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeMediaWithGemini, shouldFallbackToThumbnail } from "@/lib/ai/gemini";
import { ApplicationError } from "@/lib/errors/application-error";

const validRecipe = {
  isFood: true,
  title: "Canh rau củ",
  subtitle: "Món canh thanh nhẹ",
  duration: "30 phút",
  servings: "2 người",
  calories: "~280 kcal",
  confidence: 82,
  observations: ["Rau củ được thêm theo nhiều bước"],
  assumptions: ["Gia vị được ước tính"],
  ingredients: ["Khoai tây", "Cà rốt", "Nước dùng", "Muối"],
  steps: ["Sơ chế rau củ", "Hầm đến khi chín", "Nêm gia vị"],
  warnings: [],
};

describe("analyzeMediaWithGemini", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends a small Facebook video with multi-frame metadata", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "test-model");
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "video/mp4", "content-length": "3" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(validRecipe) }] } }],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );

    const result = await analyzeMediaWithGemini(
      {
        mediaUrl: "https://video.fbcdn.net/reel.mp4",
        mediaKind: "video",
        sourceTitle: "Canh ngon",
        sourceDescription: "Hướng dẫn nấu canh",
      },
      fetchImplementation as typeof fetch,
    );

    expect(result.title).toBe("Canh rau củ");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    const generationRequest = fetchImplementation.mock.calls[1]?.[1] as RequestInit;
    const generationBody = JSON.parse(String(generationRequest.body));
    expect(generationBody.contents[0].parts[0]).toMatchObject({
      inlineData: { mimeType: "video/mp4" },
      videoMetadata: { fps: 1 },
    });
    expect(generationBody.contents[0].parts[1].text).toContain("video đa khung hình");
  });

  it("rejects an oversized video so the route can use its thumbnail", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(null, {
        headers: { "content-type": "video/mp4", "content-length": String(101 * 1024 * 1024) },
      }),
    );

    await expect(
      analyzeMediaWithGemini(
        {
          mediaUrl: "https://video.fbcdn.net/large.mp4",
          mediaKind: "video",
          sourceTitle: "",
          sourceDescription: "",
        },
        fetchImplementation as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: "VIDEO_TOO_LARGE" });
  });

  it("streams a bounded larger video through Gemini Files API and deletes it", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "test-model");
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { "content-type": "video/mp4", "content-length": String(20 * 1024 * 1024) },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          headers: {
            "x-goog-upload-url": "https://generativelanguage.googleapis.com/upload/session/test",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            file: {
              name: "files/test-video",
              uri: "https://generativelanguage.googleapis.com/v1beta/files/test-video",
              mimeType: "video/mp4",
              state: "ACTIVE",
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(validRecipe) }] } }],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(
      analyzeMediaWithGemini(
        {
          mediaUrl: "https://video.fbcdn.net/large-but-supported.mp4",
          mediaKind: "video",
          sourceTitle: "Canh ngon",
          sourceDescription: "",
        },
        fetchImplementation as typeof fetch,
      ),
    ).resolves.toMatchObject({ title: "Canh rau củ" });

    const generationBody = JSON.parse(String(fetchImplementation.mock.calls[3]?.[1]?.body));
    expect(generationBody.contents[0].parts[0]).toMatchObject({
      fileData: {
        mimeType: "video/mp4",
        fileUri: "https://generativelanguage.googleapis.com/v1beta/files/test-video",
      },
      videoMetadata: { fps: 1 },
    });
    expect(fetchImplementation.mock.calls[4]?.[1]).toMatchObject({ method: "DELETE" });
  });
});

describe("shouldFallbackToThumbnail", () => {
  it("allows media transport failures but not authentication failures", () => {
    expect(
      shouldFallbackToThumbnail(new ApplicationError("VIDEO_DOWNLOAD_FAILED", 502, "failed")),
    ).toBe(true);
    expect(
      shouldFallbackToThumbnail(new ApplicationError("GEMINI_AUTH_FAILED", 503, "failed")),
    ).toBe(false);
  });
});
