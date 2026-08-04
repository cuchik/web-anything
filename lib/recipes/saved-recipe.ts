import { z } from "zod";
import { recipeAnalysisSchema } from "@/lib/recipes/schema";

export const saveRecipeSchema = recipeAnalysisSchema.extend({
  confidenceBand: z.enum(["low", "medium", "high"]),
  analysisMode: z.enum(["video", "thumbnail"]).default("thumbnail"),
  image: z.string().url().max(2_048),
  sourceUrl: z.string().url().max(2_048),
  promptVersion: z.string().trim().min(1).max(80),
});

export type SavedRecipePayload = z.infer<typeof saveRecipeSchema>;

export type SavedRecipe = SavedRecipePayload & {
  id: string;
  createdAt: number;
};
