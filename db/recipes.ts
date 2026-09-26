import { getDatabase } from "@/db/client";
import { ApplicationError } from "@/lib/errors/application-error";
import { saveRecipeSchema, type SavedRecipe, type SavedRecipePayload } from "@/lib/recipes/saved-recipe";

type RecipeRow = {
  id: string;
  title: string;
  source_url: string;
  image_url: string;
  recipe_json: string;
  prompt_version: string;
  created_at: number;
};

export async function listRecipes(ownerKey: string): Promise<SavedRecipe[]> {
  const database = await getDatabase();
  const result = await database
    .prepare(`
      SELECT id, title, source_url, image_url, recipe_json, prompt_version, created_at
      FROM recipes
      WHERE owner_key = ?
      ORDER BY created_at DESC
      LIMIT 100
    `)
    .bind(ownerKey)
    .all<RecipeRow>();

  return result.results.flatMap((row) => {
    try {
      const payload = saveRecipeSchema.parse(JSON.parse(row.recipe_json));
      return [{ ...payload, id: row.id, createdAt: row.created_at }];
    } catch {
      return [];
    }
  });
}

export async function createRecipe(ownerKey: string, recipe: SavedRecipePayload): Promise<SavedRecipe> {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const recipeJson = JSON.stringify(recipe);
  if (new TextEncoder().encode(recipeJson).byteLength > 24_000) {
    throw new ApplicationError("RECIPE_TOO_LARGE", 413, "Công thức vượt quá giới hạn lưu trữ.");
  }

  const database = await getDatabase();
  const result = await database
    .prepare(`
      INSERT INTO recipes (
        id, owner_key, title, source_url, image_url, recipe_json, prompt_version, created_at
      ) SELECT ?, ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM recipes WHERE owner_key = ?) < 100
    `)
    .bind(
      id,
      ownerKey,
      recipe.title,
      recipe.sourceUrl,
      recipe.image,
      recipeJson,
      recipe.promptVersion,
      createdAt,
      ownerKey,
    )
    .run();

  if (!result.meta.changes) {
    throw new ApplicationError("RECIPE_QUOTA_REACHED", 409, "Bạn đã lưu 100 công thức. Hãy xóa bớt trước khi lưu thêm.");
  }

  return { ...recipe, id, createdAt };
}

export async function deleteRecipe(ownerKey: string, id: string) {
  const database = await getDatabase();
  const result = await database
    .prepare("DELETE FROM recipes WHERE id = ? AND owner_key = ?")
    .bind(id, ownerKey)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
