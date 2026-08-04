import { NextResponse } from "next/server";
import { createRecipe, listRecipes } from "@/db/recipes";
import { requireApiOwner } from "@/lib/auth/owner";
import { toApplicationError } from "@/lib/errors/application-error";
import { saveRecipeSchema } from "@/lib/recipes/saved-recipe";

function errorResponse(error: unknown) {
  const applicationError = toApplicationError(error);
  return NextResponse.json(
    { error: { code: applicationError.code, message: applicationError.publicMessage } },
    { status: applicationError.status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  try {
    const { ownerKey } = await requireApiOwner();
    return NextResponse.json(
      { recipes: await listRecipes(ownerKey) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { ownerKey } = await requireApiOwner();
    const parsed = saveRecipeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "INVALID_RECIPE", message: "Công thức không hợp lệ để lưu." } },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { recipe: await createRecipe(ownerKey, parsed.data) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
