import { toHex } from "@/lib/crypto/hex";
import { readSessionUser } from "@/lib/auth/session";
import { ApplicationError } from "@/lib/errors/application-error";

/** Recipes are keyed by a peppered digest of the stable user id, never by a raw identifier. */
export async function ownerKeyForUser(userId: string) {
  const pepper = process.env.USER_ID_PEPPER?.trim();
  if (!pepper) {
    throw new ApplicationError(
      "MISSING_USER_ID_PEPPER",
      503,
      "Tính năng lưu chưa được cấu hình trên server.",
    );
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(userId)));
}

export async function requireApiOwner() {
  const user = await readSessionUser();
  if (!user) {
    throw new ApplicationError("AUTH_REQUIRED", 401, "Hãy đăng nhập để lưu công thức.");
  }
  return { user, ownerKey: await ownerKeyForUser(user.id) };
}
