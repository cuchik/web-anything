import { afterEach, describe, expect, it, vi } from "vitest";
import { ownerKeyForUser } from "@/lib/auth/owner";
import { saveRecipeSchema } from "@/lib/recipes/saved-recipe";

const payload = {
  isFood: true,
  analysisMode: "video" as const,
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

describe("ownerKeyForUser", () => {
  const userId = "6f1c8f7e-0c1a-4a26-9a5e-2f3b6d5c8e10";

  afterEach(() => vi.unstubAllEnvs());

  it("creates a stable owner identifier that hides the user id", async () => {
    vi.stubEnv("USER_ID_PEPPER", "test-only-secret");
    const first = await ownerKeyForUser(userId);
    const second = await ownerKeyForUser(userId);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain(userId);
  });

  it("separates two users under the same pepper", async () => {
    vi.stubEnv("USER_ID_PEPPER", "test-only-secret");
    const other = "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9";

    expect(await ownerKeyForUser(userId)).not.toBe(await ownerKeyForUser(other));
  });

  it("fails closed when the server secret is missing", async () => {
    vi.stubEnv("USER_ID_PEPPER", "");
    await expect(ownerKeyForUser(userId)).rejects.toMatchObject({
      code: "MISSING_USER_ID_PEPPER",
    });
  });
});
