import type { RecipeAnalysis } from "@/lib/recipes/schema";

export type RecipeAnalysisInput = {
  mediaUrl: string;
  mediaKind: "image" | "video";
  sourceTitle: string;
  sourceDescription: string;
};

export interface RecipeAnalysisProvider {
  analyze(input: RecipeAnalysisInput): Promise<RecipeAnalysis>;
}
