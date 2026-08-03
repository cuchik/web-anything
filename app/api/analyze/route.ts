import { NextRequest, NextResponse } from "next/server";

const fallbackImage =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88";

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]);
  }
  return "";
}

export async function POST(request: NextRequest) {
  let videoUrl = "";
  try {
    const body = (await request.json()) as { url?: string };
    videoUrl = body.url?.trim() || "";
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch";
    if (parsed.protocol !== "https:" || !allowed) {
      return NextResponse.json({ error: "Link phải là video hoặc Reel công khai trên Facebook." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Link này chưa đúng định dạng. Bạn kiểm tra lại nhé." }, { status: 400 });
  }

  let image = fallbackImage;
  let sourceTitle = "";
  const isSample = videoUrl.endsWith("/1234567890");

  if (!isSample) {
    try {
      const response = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BepTuVideo/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(6500),
      });
      if (response.ok) {
        const html = await response.text();
        image = meta(html, "og:image") || fallbackImage;
        sourceTitle = meta(html, "og:title");
      }
    } catch {
      // Public Facebook pages may reject automated previews; the demo recipe remains available.
    }
  }

  return NextResponse.json({
    recipe: {
      title: sourceTitle && sourceTitle.length < 70 ? sourceTitle : "Bò sốt tiêu đen",
      subtitle: "Thịt bò mềm mọng, sốt tiêu thơm nồng",
      image,
      duration: "30 phút",
      servings: "2 người",
      calories: "420 kcal",
      ingredients: [
        "300g thăn bò",
        "1 quả ớt chuông",
        "1/2 củ hành tây",
        "2 thìa sốt tiêu đen",
        "Tỏi, dầu hào, nước tương",
      ],
      steps: [
        "Thái bò miếng mỏng, ướp với nước tương và dầu hào trong 15 phút.",
        "Áp chảo bò trên lửa lớn đến khi vừa chín tới rồi để riêng.",
        "Xào hành tây, ớt chuông; thêm sốt tiêu đen và một chút nước.",
        "Cho bò trở lại chảo, đảo nhanh 1 phút rồi dùng nóng.",
      ],
    },
  });
}
