import { afterEach, describe, expect, it, vi } from "vitest";
import { ownerKeyForEmail } from "@/lib/auth/owner";
import { saveRecipeSchema } from "@/lib/recipes/saved-recipe";

const payload = {
  isFood: true,
  title: "Bún bò",
  subtitle: "Món bún nước đậm vị",
  duration: "45 phút",
  servings: "2 người",
  calories: "~500 kcal",
  confidence: 85,
  confidenceBand: "high" as const,
  observations: ["Có bún và thịt bò"],
  assumptions: ["Nước dùng có thể dùng sả"],
  ingredients: ["Bún", "Thịt bò", "Rau thơm"],
  steps: ["Chuẩn bị nguyên liệu", "Nấu nước dùng"],
  warnings: [],
  image: "https://scontent.fbcdn.net/dish.jpg",
  sourceUrl: "https://www.facebook.com/reel/123",
  promptVersion: "2026-08-04.1",
};

describe("saveRecipeSchema", () => {
  it("accepts a bounded analyzed recipe", () => {
    expect(saveRecipeSchema.parse(payload)).toEqual(payload);
  });

  it("rejects invalid external values", () => {
    expect(() => saveRecipeSchema.parse({ ...payload, image: "not-a-url" })).toThrow();
  });
});

describe("ownerKeyForEmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates a stable non-email owner identifier", async () => {
    vi.stubEnv("USER_ID_PEPPER", "test-only-secret");
    const first = await ownerKeyForEmail("Person@Example.com");
    const second = await ownerKeyForEmail("person@example.com");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("example.com");
  });

  it("fails closed when the server secret is missing", async () => {
    vi.stubEnv("USER_ID_PEPPER", "");
    await expect(ownerKeyForEmail("person@example.com")).rejects.toMatchObject({
      code: "MISSING_USER_ID_PEPPER",
    });
  });
});
