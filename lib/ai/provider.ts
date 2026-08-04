import type { RecipeAnalysis } from "@/lib/recipes/schema";

export type RecipeAnalysisInput = {
  imageUrl: string;
  sourceTitle: string;
  sourceDescription: string;
};

export interface RecipeAnalysisProvider {
  analyze(input: RecipeAnalysisInput): Promise<RecipeAnalysis>;
}
