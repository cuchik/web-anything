import { describe, expect, it } from "vitest";
import { readJsonBody } from "@/lib/http/api-response";

describe("bounded request JSON", () => {
  const post = (body: string, headers?: HeadersInit) => new Request("https://app.example/api", { method: "POST", body, headers });
  it("parses a bounded payload", async () => {
    await expect(readJsonBody(post('{"ok":true}'))).resolves.toEqual({ ok: true });
  });
  it("counts bytes even without Content-Length or with an understated length", async () => {
    await expect(readJsonBody(post('"' + "ế".repeat(100) + '"'), 200)).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE" });
    await expect(readJsonBody(post("x".repeat(300), { "content-length": "1" }), 200)).rejects.toMatchObject({ code: "REQUEST_TOO_LARGE" });
  });
  it("rejects oversized declared length and malformed JSON", async () => {
    await expect(readJsonBody(post("{}", { "content-length": "999999" }))).rejects.toMatchObject({ status: 413 });
    await expect(readJsonBody(post("{"))).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
});
