import { NextResponse } from "next/server";
import { deleteRecipe } from "@/db/recipes";
import { requireApiOwner } from "@/lib/auth/owner";
import { toApplicationError } from "@/lib/errors/application-error";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { ownerKey } = await requireApiOwner();
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { error: { code: "INVALID_RECIPE_ID", message: "Mã công thức không hợp lệ." } },
        { status: 400 },
      );
    }

    const deleted = await deleteRecipe(ownerKey, id);
    if (!deleted) {
      return NextResponse.json(
        { error: { code: "RECIPE_NOT_FOUND", message: "Không tìm thấy công thức." } },
        { status: 404 },
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(
      { error: { code: applicationError.code, message: applicationError.publicMessage } },
      { status: applicationError.status },
    );
  }
}
