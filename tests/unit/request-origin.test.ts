import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, isSecureRequest, resolveAppOrigin } from "@/lib/http/request-origin";

const post = (headers: Record<string, string> = {}, url = "http://localhost:3001/api/auth/signin") => new Request(url, { method: "POST", headers });
beforeEach(() => { vi.stubEnv("APP_URL", "http://localhost:3001"); vi.stubEnv("NODE_ENV", "test"); });
afterEach(() => vi.unstubAllEnvs());

describe("trusted origin", () => {
  it("requires an exact Origin even with a same-origin fetch header", () => {
    expect(() => assertSameOrigin(post({ origin: "http://localhost:3001", "sec-fetch-site": "same-origin" }))).not.toThrow();
    expect(() => assertSameOrigin(post({ "sec-fetch-site": "same-origin" }))).toThrow();
    expect(() => assertSameOrigin(post({ origin: "https://localhost:3001" }))).toThrow();
    expect(() => assertSameOrigin(post({ origin: "http://localhost:3001", "sec-fetch-site": "cross-site" }))).toThrow();
  });
  it("ignores Host and forwarded protocol for links", () => {
    expect(resolveAppOrigin(post({ host: "evil.example", "x-forwarded-proto": "https" }))).toBe("http://localhost:3001");
  });
  it.each(["", "http://app.example", "https://user:pass@app.example", "https://app.example/path", "https://app.example/?x=1"])("fails closed for production origin %s", (value) => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APP_URL", value);
    expect(() => resolveAppOrigin()).toThrow();
  });
  it("does not allow forwarded headers to downgrade cookies", () => {
    expect(isSecureRequest(post({ "x-forwarded-proto": "http" }, "https://app.example"))).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isSecureRequest(post())).toBe(true);
  });
});
