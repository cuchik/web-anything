import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "@/lib/http/security-headers";

describe("Worker security response boundary", () => {
  it.each([200, 302, 404, 503])("sets policy on status %s while preserving cookies/location", (status) => {
    const response = withSecurityHeaders(new Response(null, { status, headers: { "Set-Cookie": "session=test; HttpOnly", Location: "/signin" } }), true);
    expect(response.status).toBe(status);
    expect(response.headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(response.headers.get("Strict-Transport-Security")).toContain("max-age");
    expect(response.headers.get("Location")).toBe("/signin");
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
  });
  it("does not force HTTPS for local development", () => {
    const response = withSecurityHeaders(new Response(), false);
    expect(response.headers.has("Strict-Transport-Security")).toBe(false);
    expect(response.headers.get("Content-Security-Policy")).not.toContain("upgrade-insecure-requests");
  });
});
