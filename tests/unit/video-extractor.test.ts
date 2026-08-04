import { describe, expect, it } from "vitest";
import { extractEmbeddedFacebookVideoUrl } from "@/lib/facebook/video-extractor";

describe("extractEmbeddedFacebookVideoUrl", () => {
  it("prefers an HD progressive URL and decodes JSON escapes", () => {
    const html = String.raw`<script>{"browser_native_sd_url":"https:\/\/video.fbcdn.net\/sd.mp4","browser_native_hd_url":"https:\/\/video.fbcdn.net\/hd.mp4?token=a\u0026b=c"}</script>`;

    expect(extractEmbeddedFacebookVideoUrl(html)).toBe(
      "https://video.fbcdn.net/hd.mp4?token=a&b=c",
    );
  });

  it("reads JSON serialized inside another script string", () => {
    const html = String.raw`<script>window.payload = "{\"browser_native_sd_url\":\"https:\\/\\/video.fbcdn.net\\/dish.mp4\"}";</script>`;

    expect(extractEmbeddedFacebookVideoUrl(html)).toBe("https://video.fbcdn.net/dish.mp4");
  });

  it("rejects a progressive URL outside the Facebook media allowlist", () => {
    const html = String.raw`<script>{"browser_native_hd_url":"https:\/\/attacker.example\/dish.mp4"}</script>`;

    expect(extractEmbeddedFacebookVideoUrl(html)).toBeUndefined();
  });

  it("continues past a malformed preferred candidate", () => {
    const html = String.raw`<script>{"browser_native_hd_url":"not-a-url","browser_native_sd_url":"https:\/\/video.fbcdn.net\/dish.mp4"}</script>`;

    expect(extractEmbeddedFacebookVideoUrl(html)).toBe("https://video.fbcdn.net/dish.mp4");
  });
});
