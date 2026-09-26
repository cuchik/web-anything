import { describe, expect, it } from "vitest";
import { extractEmbeddedFacebookVideoUrls, facebookVideoId } from "@/lib/facebook/video-extractor";

const script = (data: unknown) => `<script type="application/json">${JSON.stringify(data)}</script>`;
describe("identity-scoped Facebook extraction", () => {
  it("skips a recommendation before the requested video; keeps its HD and SD", () => {
    const html = script({ videos: [
      { id: "999", browser_native_hd_url: "https://video.fbcdn.net/wrong.mp4" },
      { id: "123", browser_native_hd_url: "https://video.fbcdn.net/hd.mp4?a=1&b=2", browser_native_sd_url: "https://video.fbcdn.net/sd.mp4" },
    ] });
    expect(extractEmbeddedFacebookVideoUrls(html, "123")).toEqual([
      "https://video.fbcdn.net/hd.mp4?a=1&b=2", "https://video.fbcdn.net/sd.mp4",
    ]);
    expect(extractEmbeddedFacebookVideoUrls(html)).toEqual([]);
  });
  it("rejects unscoped media and nested different identities", () => {
    const html = script({ id: "123", related: { id: "999", playable_url: "https://video.fbcdn.net/wrong.mp4" } });
    expect(extractEmbeddedFacebookVideoUrls(html, "123")).toEqual([]);
    expect(extractEmbeddedFacebookVideoUrls(script({ playable_url: "https://video.fbcdn.net/wrong.mp4" }), "123")).toEqual([]);
  });
  it("skips unsafe HD and uses the same video's SD", () => {
    const html = script({ video_id: "123", browser_native_hd_url: "https://evil.example/a.mp4", playable_url: "https://video.fbcdn.net/sd.mp4" });
    expect(extractEmbeddedFacebookVideoUrls(html, "123")).toEqual(["https://video.fbcdn.net/sd.mp4"]);
  });
  it("does not execute script assignments", () => {
    expect(extractEmbeddedFacebookVideoUrls('<script>window.payload = "unsafe";</script>', "123")).toEqual([]);
  });
  it("normalizes reel/watch identities but does not invent IDs for share links", () => {
    expect(facebookVideoId(new URL("https://www.facebook.com/watch/?v=123"))).toBe("123");
    expect(facebookVideoId(new URL("https://www.facebook.com/reel/123/"))).toBe("123");
    expect(facebookVideoId(new URL("https://www.facebook.com/share/r/abc"))).toBeUndefined();
  });
});
