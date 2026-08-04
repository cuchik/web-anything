import { z } from "zod";

const requiredText = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const optionalText = (maxLength: number) => z.string().trim().max(maxLength);

const rawRecipeAnalysisSchema = z.object({
  isFood: z.boolean(),
  title: optionalText(120),
  subtitle: optionalText(240),
  duration: optionalText(60),
  servings: optionalText(60),
  calories: optionalText(60),
  confidence: z.number().min(0).max(100),
  observations: z.array(requiredText(240)).max(8),
  assumptions: z.array(requiredText(240)).max(8),
  ingredients: z.array(requiredText(200)).max(10),
  steps: z.array(requiredText(500)).max(8),
  warnings: z.array(requiredText(240)).max(6),
});

export const recipeAnalysisSchema = rawRecipeAnalysisSchema.superRefine((value, context) => {
  if (!value.isFood) return;

  const requiredFields = ["title", "subtitle", "duration", "servings", "calories"] as const;
  for (const field of requiredFields) {
    if (!value[field]) {
      context.addIssue({ code: "custom", path: [field], message: `${field} is required for food images` });
    }
  }
  if (value.ingredients.length < 3) {
    context.addIssue({ code: "custom", path: ["ingredients"], message: "At least 3 ingredients are required" });
  }
  if (value.steps.length < 2) {
    context.addIssue({ code: "custom", path: ["steps"], message: "At least 2 steps are required" });
  }
  if (!value.calories.startsWith("~")) {
    context.addIssue({ code: "custom", path: ["calories"], message: "Calories must be marked as estimated" });
  }
});

export type ConfidenceBand = "low" | "medium" | "high";

export type RecipeAnalysis = z.infer<typeof recipeAnalysisSchema> & {
  confidenceBand: ConfidenceBand;
};

export function confidenceBandFor(value: number): ConfidenceBand {
  if (value >= 80) return "high";
  if (value >= 55) return "medium";
  return "low";
}

export function parseRecipeAnalysis(value: unknown): RecipeAnalysis {
  const recipe = recipeAnalysisSchema.parse(value);
  const confidence = Math.round(recipe.confidence);
  return {
    ...recipe,
    confidence,
    confidenceBand: confidenceBandFor(confidence),
  };
}
