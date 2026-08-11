import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, isSecureRequest, resolveAppOrigin } from "@/lib/http/request-origin";

function post(headers: Record<string, string>, url = "http://localhost:3001/api/auth/signin") {
  return new Request(url, { method: "POST", headers });
}

describe("assertSameOrigin", () => {
  it("allows a same-origin fetch", () => {
    expect(() => assertSameOrigin(post({ "sec-fetch-site": "same-origin" }))).not.toThrow();
  });

  it("blocks cross-site and unknown callers", () => {
    expect(() => assertSameOrigin(post({ "sec-fetch-site": "cross-site" }))).toThrow();
    expect(() => assertSameOrigin(post({ "sec-fetch-site": "none" }))).toThrow();
    expect(() => assertSameOrigin(post({}))).toThrow();
  });

  it("falls back to the Origin header when Sec-Fetch-Site is absent", () => {
    const sameOrigin = post({ origin: "http://localhost:3001", host: "localhost:3001" });
    expect(() => assertSameOrigin(sameOrigin)).not.toThrow();

    const otherOrigin = post({ origin: "https://evil.example", host: "localhost:3001" });
    expect(() => assertSameOrigin(otherOrigin)).toThrow();

    const brokenOrigin = post({ origin: "not a url", host: "localhost:3001" });
    expect(() => assertSameOrigin(brokenOrigin)).toThrow();
  });
});

describe("isSecureRequest", () => {
  it("trusts the forwarded protocol before the request url", () => {
    expect(isSecureRequest(post({ "x-forwarded-proto": "https" }))).toBe(true);
    expect(isSecureRequest(post({ "x-forwarded-proto": "https, http" }))).toBe(true);
    expect(isSecureRequest(post({ "x-forwarded-proto": "http" }, "https://app.example/x"))).toBe(false);
    expect(isSecureRequest(post({}, "https://app.example/x"))).toBe(true);
    expect(isSecureRequest(post({}))).toBe(false);
  });
});

describe("resolveAppOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers the configured origin over a client-supplied host", () => {
    vi.stubEnv("APP_URL", "https://app.example/ignored/path");
    expect(resolveAppOrigin(post({ host: "evil.example" }))).toBe("https://app.example");
  });

  it("falls back to the request host when unconfigured", () => {
    vi.stubEnv("APP_URL", "");
    expect(resolveAppOrigin(post({ host: "localhost:3001" }))).toBe("http://localhost:3001");
    expect(
      resolveAppOrigin(post({ host: "app.example", "x-forwarded-proto": "https" })),
    ).toBe("https://app.example");
  });

  it("fails closed on an unparsable configured origin", () => {
    vi.stubEnv("APP_URL", "not a url");
    expect(() => resolveAppOrigin(post({ host: "localhost:3001" }))).toThrow();
  });
});
