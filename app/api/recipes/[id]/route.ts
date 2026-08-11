import { NextResponse } from "next/server";
import { deleteRecipe } from "@/db/recipes";
import { requireApiOwner } from "@/lib/auth/owner";
import { ApplicationError } from "@/lib/errors/application-error";
import { apiErrorResponse } from "@/lib/http/api-response";
import { assertSameOrigin } from "@/lib/http/request-origin";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { ownerKey } = await requireApiOwner();
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      throw new ApplicationError("INVALID_RECIPE_ID", 400, "Mã công thức không hợp lệ.");
    }

    const deleted = await deleteRecipe(ownerKey, id);
    if (!deleted) {
      throw new ApplicationError("RECIPE_NOT_FOUND", 404, "Không tìm thấy công thức.");
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
