import { beforeEach, describe, expect, it } from "vitest";
import { consumeRateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

describe("consumeRateLimit", () => {
  beforeEach(resetRateLimitsForTests);

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
