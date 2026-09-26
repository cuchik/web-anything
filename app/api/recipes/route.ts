import { createRecipe, listRecipes } from "@/db/recipes";
import { requireApiOwner } from "@/lib/auth/owner";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse, noStoreJson, readJsonBody } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/http/request-origin";
import { saveRecipeSchema } from "@/lib/recipes/saved-recipe";
import { assertRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const { ownerKey } = await requireApiOwner();
    return noStoreJson({ recipes: await listRecipes(ownerKey) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { ownerKey } = await requireApiOwner();
    await assertRateLimit([{ key: `recipe-write:${ownerKey}`, limit: 20, windowMs: 60_000 }]);
    const parsed = saveRecipeSchema.safeParse(await readJsonBody(request, 24_000));
    if (!parsed.success) {
      throw new ApplicationError("INVALID_RECIPE", 400, "Công thức không hợp lệ để lưu.");
    }
    return noStoreJson({ recipe: await createRecipe(ownerKey, parsed.data) }, 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
