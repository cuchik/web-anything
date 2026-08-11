import { afterEach, describe, expect, it, vi } from "vitest";
import { hashPassword, passwordHashIterations, verifyPassword } from "@/lib/auth/password";

// Keeps the suite fast; production iterations come from passwordHashIterations().
const fastIterations = "100000";

describe("passwordHashIterations", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("clamps a configured value into the supported range", () => {
    vi.stubEnv("PASSWORD_HASH_ITERATIONS", "1");
    expect(passwordHashIterations()).toBe(100_000);

    vi.stubEnv("PASSWORD_HASH_ITERATIONS", "99999999");
    expect(passwordHashIterations()).toBe(1_000_000);
  });

  it("falls back to the default when unset or unparsable", () => {
    vi.stubEnv("PASSWORD_HASH_ITERATIONS", "");
    expect(passwordHashIterations()).toBe(210_000);

    vi.stubEnv("PASSWORD_HASH_ITERATIONS", "not-a-number");
    expect(passwordHashIterations()).toBe(210_000);
  });
});

describe("password hashing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("verifies the correct password and rejects a wrong one", async () => {
    vi.stubEnv("PASSWORD_HASH_ITERATIONS", fastIterations);
    const stored = await hashPassword("một mật khẩu dài an toàn");

    expect(await verifyPassword("một mật khẩu dài an toàn", stored)).toBe(true);
    expect(await verifyPassword("một mật khẩu dài an toan", stored)).toBe(false);
  });

  it("never stores the password and salts every hash", async () => {
    vi.stubEnv("PASSWORD_HASH_ITERATIONS", fastIterations);
    const first = await hashPassword("cùng một mật khẩu dài");
    const second = await hashPassword("cùng một mật khẩu dài");

    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
  });

  it("matches the same password across unicode input forms", async () => {
    vi.stubEnv("PASSWORD_HASH_ITERATIONS", fastIterations);
    const composed = "mật khẩu tiếng Việt";
    const stored = await hashPassword(composed);

    expect(await verifyPassword(composed.normalize("NFD"), stored)).toBe(true);
  });

  it("rejects a record with a tampered or weak iteration count", async () => {
    vi.stubEnv("PASSWORD_HASH_ITERATIONS", fastIterations);
    const stored = await hashPassword("một mật khẩu dài an toàn");

    expect(await verifyPassword("một mật khẩu dài an toàn", { ...stored, iterations: 1 })).toBe(false);
    expect(await verifyPassword("một mật khẩu dài an toàn", { ...stored, salt: "zz" })).toBe(false);
  });
});
