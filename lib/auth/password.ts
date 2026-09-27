import { fromHex, timingSafeEqualHex, toHex } from "@/lib/crypto/hex";
import { getServerConfig } from "@/lib/config/server";
import { ApplicationError } from "@/lib/errors/application-error";

const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 1_000_000;
const DERIVED_KEY_BITS = 256;
const SALT_BYTES = 16;

export type StoredPassword = {
  hash: string;
  salt: string;
  iterations: number;
};

/**
 * PBKDF2-HMAC-SHA256 is the only password KDF available natively on Workers.
 * Cloudflare caps native PBKDF2 at 100,000 iterations. Stored iteration counts
 * are preserved for verification; never silently clamp an existing hash.
 */
export function passwordHashIterations() {
  return getServerConfig().PASSWORD_HASH_ITERATIONS;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    // Normalized so the same typed password matches across input methods.
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    DERIVED_KEY_BITS,
  ).catch((error: unknown) => {
    if (error instanceof Error && error.name === "NotSupportedError") {
      throw new ApplicationError("PASSWORD_HASH_UNSUPPORTED", 503,
        "Cấu hình bảo mật tài khoản chưa tương thích với server. Vui lòng liên hệ quản trị viên.",
        false, { cause: error });
    }
    throw error;
  });
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<StoredPassword> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iterations = passwordHashIterations();
  return {
    hash: await derivePasswordHash(password, salt, iterations),
    salt: toHex(salt),
    iterations,
  };
}

export async function verifyPassword(password: string, stored: StoredPassword) {
  const salt = fromHex(stored.salt);
  if (!salt || salt.length !== SALT_BYTES || !Number.isInteger(stored.iterations) ||
      stored.iterations < MIN_ITERATIONS || stored.iterations > MAX_ITERATIONS) {
    return false;
  }

  const candidate = await derivePasswordHash(password, salt, stored.iterations);
  return timingSafeEqualHex(candidate, stored.hash);
}
