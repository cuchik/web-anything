import { z } from "zod";
import { recipeAnalysisSchema } from "@/lib/recipes/schema";
import { isAllowedFacebookImageUrl, isFacebookVideoUrl } from "@/lib/facebook/url";

function safeUrl(value: string, allowed: (url: URL) => boolean) {
  try { return allowed(new URL(value)); } catch { return false; }
}

export const saveRecipeSchema = recipeAnalysisSchema.extend({
  confidenceBand: z.enum(["low", "medium", "high"]),
  analysisMode: z.enum(["video", "thumbnail"]).default("thumbnail"),
  image: z.string().url().max(2_048).refine((value) => safeUrl(value, isAllowedFacebookImageUrl)),
  sourceUrl: z.string().url().max(2_048).refine((value) => safeUrl(value, isFacebookVideoUrl)),
  promptVersion: z.string().trim().min(1).max(80).refine((value) => value !== "sample"),
});

export type SavedRecipePayload = z.infer<typeof saveRecipeSchema>;

export type SavedRecipe = SavedRecipePayload & {
  id: string;
  createdAt: number;
};
