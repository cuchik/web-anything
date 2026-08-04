import { describe, expect, it } from "vitest";
import {
  isAllowedFacebookImageUrl,
  parseFacebookVideoUrl,
} from "@/lib/facebook/url";

describe("parseFacebookVideoUrl", () => {
  it.each([
    "https://www.facebook.com/reel/123",
    "https://facebook.com/watch?v=123",
    "https://m.facebook.com/user/videos/123",
    "https://fb.watch/abc123/",
    "https://www.facebook.com/share/r/abc123/",
  ])("accepts supported public video URLs: %s", (value) => {
    expect(parseFacebookVideoUrl(value)).toBeInstanceOf(URL);
  });

  it.each([
    "http://facebook.com/reel/123",
    "https://facebook.com/l.php?u=https://example.com",
    "https://facebook.com/profile.php?id=123",
    "https://user:password@facebook.com/reel/123",
    "https://example.com/reel/123",
  ])("rejects unsafe or unsupported URLs: %s", (value) => {
    expect(() => parseFacebookVideoUrl(value)).toThrow();
  });
});

describe("isAllowedFacebookImageUrl", () => {
  it("accepts Facebook CDN images", () => {
    expect(isAllowedFacebookImageUrl(new URL("https://scontent.fsgn2-9.fna.fbcdn.net/image.jpg"))).toBe(true);
  });

  it("rejects arbitrary and non-HTTPS images", () => {
    expect(isAllowedFacebookImageUrl(new URL("https://example.com/image.jpg"))).toBe(false);
    expect(isAllowedFacebookImageUrl(new URL("http://scontent.fbcdn.net/image.jpg"))).toBe(false);
  });
});
