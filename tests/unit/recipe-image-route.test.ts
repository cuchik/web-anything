import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/recipe-image/route";
import { ApplicationError } from "@/lib/errors/application-error";
const mocks = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ assertRateLimit: mocks.limit, getClientKey: () => "test" }));
beforeEach(() => { vi.stubEnv("APP_URL", "https://app.example"); mocks.limit.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
function request(image: string, origin = "https://app.example") {
  return new Request("https://app.example/api/recipe-image", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ image }) });
}
it("rejects cross-origin requests before fetching", async () => {
  expect((await POST(request("https://scontent.fbcdn.net/a", "https://evil.example"))).status).toBe(403);
  expect(mocks.limit).not.toHaveBeenCalled();
});
it("rejects bad URLs before rate-limit/database work", async () => {
  expect((await POST(request("not-a-url"))).status).toBe(400);
  expect(mocks.limit).not.toHaveBeenCalled();
});
it("honors rate limits before network work", async () => {
  mocks.limit.mockRejectedValue(new ApplicationError("RATE_LIMITED", 429, "Try later"));
  const response = await POST(request("https://scontent.fbcdn.net/a"));
  expect(response.status).toBe(429);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
