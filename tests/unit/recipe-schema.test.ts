import { describe, expect, it } from "vitest";
import { parseRecipeAnalysis } from "@/lib/recipes/schema";

const validRecipe = {
  isFood: true,
  title: "Bún bò",
  subtitle: "Món bún nước đậm vị",
  duration: "45 phút",
  servings: "2 người",
  calories: "~500 kcal",
  confidence: 84.6,
  observations: ["Có bún và thịt bò trong tô"],
  assumptions: ["Nước dùng có thể dùng sả"],
  ingredients: ["Bún", "Thịt bò", "Rau thơm"],
  steps: ["Chuẩn bị nguyên liệu", "Nấu nước dùng"],
  warnings: ["Nấu chín kỹ thịt bò nếu phục vụ trẻ nhỏ"],
};

describe("parseRecipeAnalysis", () => {
  it("normalizes a valid food analysis", () => {
    expect(parseRecipeAnalysis(validRecipe)).toMatchObject({
      confidence: 85,
      confidenceBand: "high",
    });
  });

  it("accepts a non-food classification without inventing a recipe", () => {
    expect(
      parseRecipeAnalysis({
        ...validRecipe,
        isFood: false,
        title: "",
        subtitle: "",
        duration: "",
        servings: "",
        calories: "",
        ingredients: [],
        steps: [],
      }),
    ).toMatchObject({ isFood: false });
  });

  it("rejects unbounded or unsupported food output", () => {
    expect(() => parseRecipeAnalysis({ ...validRecipe, title: "a".repeat(121) })).toThrow();
    expect(() => parseRecipeAnalysis({ ...validRecipe, ingredients: ["one"] })).toThrow();
    expect(() => parseRecipeAnalysis({ ...validRecipe, calories: "500 kcal" })).toThrow();
  });
});
