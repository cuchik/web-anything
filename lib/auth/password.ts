import { fromHex, timingSafeEqualHex, toHex } from "@/lib/crypto/hex";

const DEFAULT_ITERATIONS = 210_000;
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
 * Iterations are tunable because the hash runs inside the request CPU budget.
 */
export function passwordHashIterations() {
  const raw = process.env.PASSWORD_HASH_ITERATIONS?.trim();
  if (!raw) return DEFAULT_ITERATIONS;

  const configured = Number(raw);
  if (!Number.isInteger(configured)) return DEFAULT_ITERATIONS;
  return Math.min(MAX_ITERATIONS, Math.max(MIN_ITERATIONS, configured));
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
  );
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
  if (!salt || !Number.isInteger(stored.iterations) || stored.iterations < MIN_ITERATIONS) {
    return false;
  }

  const candidate = await derivePasswordHash(password, salt, stored.iterations);
  return timingSafeEqualHex(candidate, stored.hash);
}
