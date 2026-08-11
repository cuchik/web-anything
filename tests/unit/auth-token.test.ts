import { describe, expect, it } from "vitest";
import { createAuthToken, hashAuthToken, TOKEN_PATTERN } from "@/lib/auth/token";
import { fromHex, timingSafeEqualHex, toHex } from "@/lib/crypto/hex";

describe("createAuthToken", () => {
  it("returns an unpredictable token and its stored digest", async () => {
    const first = await createAuthToken();
    const second = await createAuthToken();

    expect(first.token).toMatch(TOKEN_PATTERN);
    expect(first.id).toMatch(TOKEN_PATTERN);
    expect(first.token).not.toBe(second.token);
    // The stored id must not be the token itself, or a leaked row would be replayable.
    expect(first.id).not.toBe(first.token);
    expect(first.id).toBe(await hashAuthToken(first.token));
  });
});

describe("hex helpers", () => {
  it("round-trips bytes", () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 254, 255]);
    expect(toHex(bytes)).toBe("00010f10feff");
    expect(fromHex("00010f10feff")).toEqual(bytes);
  });

  it("rejects malformed hex", () => {
    expect(fromHex("")).toBeNull();
    expect(fromHex("abc")).toBeNull();
    expect(fromHex("zz")).toBeNull();
  });

  it("compares equal-length digests only", () => {
    expect(timingSafeEqualHex("abcd", "abcd")).toBe(true);
    expect(timingSafeEqualHex("abcd", "abce")).toBe(false);
    expect(timingSafeEqualHex("abcd", "abc")).toBe(false);
  });
});
