import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit, getClientKey, resetRateLimitsForTests } from "@/lib/rate-limit";
import { ApplicationError } from "@/lib/errors/application-error";

vi.mock("@/db/client", () => ({
  getOptionalDatabase: async () => null,
  getDatabase: async () => { throw new ApplicationError("DATABASE_UNAVAILABLE", 503, "unavailable"); },
}));
afterEach(() => vi.unstubAllEnvs());

describe("consumeRateLimit", () => {
  beforeEach(resetRateLimitsForTests);
  it("fails closed in production without D1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(consumeRateLimit("client")).rejects.toMatchObject({ code: "DATABASE_UNAVAILABLE" });
  });
  it("does not accept an arbitrary forwarded IP as a trusted identity", () => {
    expect(getClientKey(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBe("anonymous");
  });

  it("blocks requests after the configured limit", async () => {
    expect((await consumeRateLimit("client", { limit: 2, now: 0 })).allowed).toBe(true);
    expect((await consumeRateLimit("client", { limit: 2, now: 1 })).allowed).toBe(true);
    expect(await consumeRateLimit("client", { limit: 2, now: 2 })).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("resets after the window expires", async () => {
    await consumeRateLimit("client", { limit: 1, windowMs: 100, now: 0 });
    expect((await consumeRateLimit("client", { limit: 1, windowMs: 100, now: 50 })).allowed).toBe(false);
    expect((await consumeRateLimit("client", { limit: 1, windowMs: 100, now: 101 })).allowed).toBe(true);
  });
});
