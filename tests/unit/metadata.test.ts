import { describe, expect, it } from "vitest";
import { extractMetaContent, fetchFacebookMetadata } from "@/lib/facebook/metadata";

describe("extractMetaContent", () => {
  it("extracts metadata regardless of attribute order", () => {
    const html = `
      <meta property="og:title" content="Bún bò &amp; rau">
      <meta content="https://scontent.fbcdn.net/dish.jpg" property="og:image">
    `;

    expect(extractMetaContent(html, "og:title")).toBe("Bún bò & rau");
    expect(extractMetaContent(html, "og:image")).toBe("https://scontent.fbcdn.net/dish.jpg");
  });
});

describe("fetchFacebookMetadata", () => {
  it("returns bounded, validated Facebook metadata", async () => {
    const html = `
      <meta property="og:image" content="https://scontent.fbcdn.net/dish.jpg">
      <meta property="og:title" content="Món ngon">
      <meta property="og:description" content="Công thức dễ làm">
      <meta property="og:video:secure_url" content="https://video.fsgn2-9.fna.fbcdn.net/dish.mp4">
    `;
    const fetchImplementation = async () =>
      new Response(html, { status: 200, headers: { "content-type": "text/html" } });

    await expect(
      fetchFacebookMetadata(
        new URL("https://www.facebook.com/reel/123"),
        fetchImplementation as typeof fetch,
      ),
    ).resolves.toEqual({
      imageUrl: "https://scontent.fbcdn.net/dish.jpg",
      videoUrl: "https://video.fsgn2-9.fna.fbcdn.net/dish.mp4",
      title: "Món ngon",
      description: "Công thức dễ làm",
    });
  });

  it("ignores an unsafe direct video URL while retaining the thumbnail fallback", async () => {
    const html = `
      <meta property="og:image" content="https://scontent.fbcdn.net/dish.jpg">
      <meta property="og:video" content="https://example.com/dish.mp4">
    `;
    const fetchImplementation = async () =>
      new Response(html, { status: 200, headers: { "content-type": "text/html" } });

    await expect(
      fetchFacebookMetadata(
        new URL("https://www.facebook.com/reel/123"),
        fetchImplementation as typeof fetch,
      ),
    ).resolves.toMatchObject({
      imageUrl: "https://scontent.fbcdn.net/dish.jpg",
      videoUrl: undefined,
    });
  });

  it("rejects an image hosted outside Facebook", async () => {
    const html = `<meta property="og:image" content="https://example.com/dish.jpg">`;
    const fetchImplementation = async () =>
      new Response(html, { status: 200, headers: { "content-type": "text/html" } });

    await expect(
      fetchFacebookMetadata(
        new URL("https://www.facebook.com/reel/123"),
        fetchImplementation as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: "UNSAFE_IMAGE_URL" });
  });
});
