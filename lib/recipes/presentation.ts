import type { RecipeAnalysis } from "@/lib/recipes/schema";

export type DisplayRecipe = RecipeAnalysis & {
  analysisMode: "video" | "thumbnail";
  image: string;
  sourceUrl: string;
  promptVersion: string;
};

export const confidenceLabels = {
  low: "Thấp — nên kiểm tra lại món",
  medium: "Trung bình",
  high: "Cao",
} as const;

export function analysisLabel(recipe: DisplayRecipe) {
  const mode = recipe.analysisMode === "video" ? "Phân tích video đa khung hình" : "Ước tính từ ảnh đại diện";
  return recipe.promptVersion === "sample" ? `Minh họa · ${mode}` : mode;
}

export function recipeDisclaimer(recipe: DisplayRecipe) {
  return `${recipe.promptVersion === "sample" ? "Công thức minh họa. " : ""}AI ước tính từ ${recipe.analysisMode === "video" ? "các khung hình trong video" : "ảnh đại diện"}. Hãy kiểm tra nguyên liệu, dị ứng và độ chín an toàn trước khi dùng.`;
}

export function recipeText(recipe: DisplayRecipe) {
  return `${recipe.title}\n${analysisLabel(recipe)}\n\nNguyên liệu:\n${recipe.ingredients.map((item) => `• ${item}`).join("\n")}\n\nCách làm:\n${recipe.steps.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n${recipe.warnings.join("\n")}\n${recipeDisclaimer(recipe)}`;
}

export function recipeFilename(title: string) {
  const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
  return `${slug || "cong-thuc"}.png`;
}
