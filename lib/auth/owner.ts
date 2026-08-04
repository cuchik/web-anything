import { ApplicationError } from "@/lib/errors/application-error";
import { getChatGPTUser } from "@/app/chatgpt-auth";

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ownerKeyForEmail(email: string) {
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
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(email.trim().toLowerCase())));
}

export async function requireApiOwner() {
  const user = await getChatGPTUser();
  if (!user) {
    throw new ApplicationError(
      "AUTH_REQUIRED",
      401,
      "Hãy đăng nhập bằng ChatGPT để lưu công thức.",
    );
  }
  return { user, ownerKey: await ownerKeyForEmail(user.email) };
}
