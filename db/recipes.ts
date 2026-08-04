import { ApplicationError } from "@/lib/errors/application-error";
import type { SavedRecipe, SavedRecipePayload } from "@/lib/recipes/saved-recipe";

type RecipeRow = {
  id: string;
  title: string;
  source_url: string;
  image_url: string;
  recipe_json: string;
  prompt_version: string;
  created_at: number;
};

let schemaReady: Promise<void> | undefined;

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      503,
      "Kho công thức chưa được cấu hình trên server.",
    );
  }
  return env.DB;
}

async function ensureSchema() {
  schemaReady ??= (async () => {
    const database = await getDatabase();
    await database.batch([
      database.prepare(`
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY NOT NULL,
          owner_key TEXT NOT NULL,
          title TEXT NOT NULL,
          source_url TEXT NOT NULL,
          image_url TEXT NOT NULL,
          recipe_json TEXT NOT NULL,
          prompt_version TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS recipes_owner_created_idx ON recipes (owner_key, created_at)",
      ),
    ]);
  })();
  await schemaReady;
}

export async function listRecipes(ownerKey: string): Promise<SavedRecipe[]> {
  await ensureSchema();
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
      const payload = JSON.parse(row.recipe_json) as SavedRecipePayload;
      return [{ ...payload, id: row.id, createdAt: row.created_at }];
    } catch {
      return [];
    }
  });
}

export async function createRecipe(ownerKey: string, recipe: SavedRecipePayload): Promise<SavedRecipe> {
  await ensureSchema();
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const recipeJson = JSON.stringify(recipe);
  if (recipeJson.length > 24_000) {
    throw new ApplicationError("RECIPE_TOO_LARGE", 413, "Công thức vượt quá giới hạn lưu trữ.");
  }

  const database = await getDatabase();
  await database
    .prepare(`
      INSERT INTO recipes (
        id, owner_key, title, source_url, image_url, recipe_json, prompt_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    )
    .run();

  return { ...recipe, id, createdAt };
}

export async function deleteRecipe(ownerKey: string, id: string) {
  await ensureSchema();
  const database = await getDatabase();
  const result = await database
    .prepare("DELETE FROM recipes WHERE id = ? AND owner_key = ?")
    .bind(id, ownerKey)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
