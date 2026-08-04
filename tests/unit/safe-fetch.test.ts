import { describe, expect, it, vi } from "vitest";
import { readBytesWithLimit, safeFetch } from "@/lib/http/safe-fetch";

describe("safeFetch", () => {
  it("follows an allowed redirect", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/final" } }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await safeFetch("https://facebook.com/start", {
      isAllowedUrl: (url) => url.hostname.endsWith("facebook.com"),
      fetchImplementation: fetchImplementation as typeof fetch,
    });

    expect(response.status).toBe(200);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("blocks a redirect to an untrusted host", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }),
    );

    await expect(
      safeFetch("https://facebook.com/start", {
        isAllowedUrl: (url) => url.protocol === "https:" && url.hostname.endsWith("facebook.com"),
        fetchImplementation: fetchImplementation as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "UNSAFE_UPSTREAM_URL" });
  });
});

describe("readBytesWithLimit", () => {
  it("rejects a declared oversized body before reading it", async () => {
    const response = new Response("small", { headers: { "content-length": "1000" } });
    await expect(readBytesWithLimit(response, 100)).rejects.toMatchObject({
      code: "UPSTREAM_RESPONSE_TOO_LARGE",
    });
  });

  it("rejects a streamed body that exceeds the limit", async () => {
    const response = new Response("1234567890");
    await expect(readBytesWithLimit(response, 5)).rejects.toMatchObject({
      code: "UPSTREAM_RESPONSE_TOO_LARGE",
    });
  });
});
