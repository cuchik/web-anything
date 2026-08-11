import { toHex } from "@/lib/crypto/hex";

const TOKEN_BYTES = 32;

export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** Only the digest is persisted, so a database leak cannot be replayed as a token. */
export async function hashAuthToken(token: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
}

export async function createAuthToken() {
  const token = toHex(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
  return { token, id: await hashAuthToken(token) };
}
