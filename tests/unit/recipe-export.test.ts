import { describe, expect, it, vi } from "vitest";
import { exportImageSchema, fetchExportImage } from "@/lib/facebook/export-image";
import { SAMPLE_IMAGE_URL } from "@/lib/facebook/url";
import { wrapText } from "@/lib/recipes/export-layout";
import { analysisLabel, recipeDisclaimer, recipeFilename, recipeText, type DisplayRecipe } from "@/lib/recipes/presentation";

const recipe: DisplayRecipe = {
  isFood: true, analysisMode: "video", title: "Tôm hấp rau củ", subtitle: "Không có trong ảnh xuất",
  duration: "15 phút", servings: "1 người", calories: "~330 kcal", confidence: 85, confidenceBand: "high",
  observations: ["Có tôm"], assumptions: ["Thời gian ước tính"], ingredients: ["Tôm", "Trứng", "Rau củ"],
  steps: ["Sơ chế", "Hấp chín"], warnings: ["Lưu ý dị ứng tôm"],
  image: "https://scontent.fbcdn.net/dish.jpg", sourceUrl: "https://www.facebook.com/reel/123", promptVersion: "test",
};

describe("recipe export", () => {
  it("preserves all recipe text, warning and mode in copy output", () => {
    const text = recipeText(recipe);
    for (const item of [...recipe.ingredients, ...recipe.steps, ...recipe.warnings]) expect(text).toContain(item);
    expect(text).toContain("video đa khung hình");
    expect(text).not.toContain(recipe.subtitle);
    expect(recipeDisclaimer({ ...recipe, analysisMode: "thumbnail" })).toContain("ảnh đại diện");
    expect(analysisLabel({ ...recipe, promptVersion: "sample" })).toContain("Minh họa");
  });
  it("makes a filesystem-safe Vietnamese filename", () => {
    expect(recipeFilename("Đậu hũ / Tôm: hấp?" )).toBe("dau-hu-tom-hap.png");
    expect(recipeFilename("<>" )).toBe("cong-thuc.png");
  });
  it("wraps paragraphs and unbroken strings without truncating", () => {
    const measure = (text: string) => text.length;
    expect(wrapText("Tôm hấp rau củ", 7, measure)).toEqual(["Tôm hấp", "rau củ"]);
    expect(wrapText("abcdefghij\ncanh", 4, measure)).toEqual(["abcd", "efgh", "ij", "canh"]);
  });
  it.each(["invalid", "http://scontent.fbcdn.net/a", "https://evil.example/a", "https://fbcdn.net.evil.example/a", "https://user:secret@fbcdn.net/a", "https://images.unsplash.com/other"])("rejects unsafe input %s", (image) => {
    expect(exportImageSchema.safeParse({ image }).success).toBe(false);
  });
  it("accepts the exact demo asset and Facebook CDN", () => {
    expect(exportImageSchema.safeParse({ image: SAMPLE_IMAGE_URL }).success).toBe(true);
    expect(exportImageSchema.safeParse({ image: recipe.image }).success).toBe(true);
  });
  it("fetches images with manual redirects and a timeout", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "image/png" } }));
    expect(await fetchExportImage(recipe.image, fetcher)).toMatchObject({ type: "image/png" });
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "manual", signal: expect.any(AbortSignal) }));
  });
  it("blocks redirect to another host before fetching it", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://evil.example/image" } }));
    await expect(fetchExportImage(recipe.image, fetcher)).rejects.toMatchObject({ code: "UNSAFE_UPSTREAM_URL" });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each(["text/html", "image/svg+xml"])("rejects active content %s", async (type) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("content", { headers: { "Content-Type": type } }));
    await expect(fetchExportImage(recipe.image, fetcher)).rejects.toMatchObject({ code: "IMAGE_UNAVAILABLE" });
  });
  it("rejects an oversized streamed body even without content-length", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { "Content-Type": "image/jpeg" } }));
    await expect(fetchExportImage(recipe.image, fetcher)).rejects.toMatchObject({ code: "UPSTREAM_RESPONSE_TOO_LARGE" });
  });
});
