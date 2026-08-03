import { NextRequest, NextResponse } from "next/server";

const fallbackImage =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88";

type GeminiRecipe = {
  title: string;
  subtitle: string;
  duration: string;
  servings: string;
  calories: string;
  confidence: number;
  ingredients: string[];
  steps: string[];
};

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

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function validateRecipe(value: unknown): GeminiRecipe {
  if (!value || typeof value !== "object") throw new Error("INVALID_RECIPE");
  const recipe = value as Partial<GeminiRecipe>;
  const strings = [recipe.title, recipe.subtitle, recipe.duration, recipe.servings, recipe.calories];
  if (
    strings.some((item) => typeof item !== "string" || !item.trim()) ||
    !Array.isArray(recipe.ingredients) ||
    recipe.ingredients.length < 3 ||
    recipe.ingredients.some((item) => typeof item !== "string") ||
    !Array.isArray(recipe.steps) ||
    recipe.steps.length < 2 ||
    recipe.steps.some((item) => typeof item !== "string") ||
    typeof recipe.confidence !== "number"
  ) {
    throw new Error("INVALID_RECIPE");
  }

  return {
    title: recipe.title!.trim(),
    subtitle: recipe.subtitle!.trim(),
    duration: recipe.duration!.trim(),
    servings: recipe.servings!.trim(),
    calories: recipe.calories!.trim(),
    confidence: Math.max(0, Math.min(100, Math.round(recipe.confidence))),
    ingredients: recipe.ingredients.map((item) => item.trim()).slice(0, 10),
    steps: recipe.steps.map((item) => item.trim()).slice(0, 8),
  };
}

async function analyzeWithGemini(imageUrl: string, sourceTitle: string, sourceDescription: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const imageResponse = await fetch(imageUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
  });
  if (!imageResponse.ok) throw new Error("IMAGE_DOWNLOAD_FAILED");

  const contentType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const imageBuffer = await imageResponse.arrayBuffer();
  if (!contentType.startsWith("image/") || imageBuffer.byteLength > 8 * 1024 * 1024) {
    throw new Error("INVALID_IMAGE");
  }

  const prompt = `
Bạn là chuyên gia ẩm thực Việt Nam. Hãy phân tích ảnh đại diện của một video nấu ăn và tạo một công thức thực tế bằng tiếng Việt.

Thông tin bổ sung từ Facebook:
- Tiêu đề: ${sourceTitle || "Không có"}
- Mô tả: ${sourceDescription || "Không có"}

Quy tắc:
- Ưu tiên những gì thực sự nhìn thấy trong ảnh; không mặc định đây là bò sốt tiêu đen.
- Đặt tên món ngắn gọn, tự nhiên. Subtitle mô tả món trong một câu.
- Nguyên liệu và định lượng có thể ước tính để người dùng nấu được tại nhà, nhưng không khẳng định chi tiết không thể quan sát.
- Calories là ước tính cho mỗi khẩu phần và phải bắt đầu bằng ký tự ~.
- Confidence từ 0 đến 100 phản ánh mức chắc chắn khi nhận diện món.
- Trả 4–10 nguyên liệu và 3–8 bước làm rõ ràng.
`;

  const schema = {
    type: "object",
    properties: {
      title: { type: "string", description: "Tên món ăn bằng tiếng Việt" },
      subtitle: { type: "string", description: "Mô tả ngắn món ăn" },
      duration: { type: "string", description: "Tổng thời gian, ví dụ 35 phút" },
      servings: { type: "string", description: "Khẩu phần, ví dụ 2 người" },
      calories: { type: "string", description: "Calories ước tính mỗi khẩu phần, bắt đầu bằng ~" },
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      ingredients: { type: "array", items: { type: "string" } },
      steps: { type: "array", items: { type: "string" } },
    },
    required: ["title", "subtitle", "duration", "servings", "calories", "confidence", "ingredients", "steps"],
  };

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: contentType, data: toBase64(imageBuffer) } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!geminiResponse.ok) {
    if (geminiResponse.status === 429) throw new Error("QUOTA_EXCEEDED");
    if (geminiResponse.status === 400 || geminiResponse.status === 403) throw new Error("INVALID_API_KEY");
    throw new Error("GEMINI_FAILED");
  }

  const data = (await geminiResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("EMPTY_GEMINI_RESPONSE");
  return validateRecipe(JSON.parse(text));
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
  let sourceDescription = "";
  const isSample = videoUrl.endsWith("/1234567890");

  if (!isSample) {
    try {
      const response = await fetch(videoUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BepTuVideo/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(6_500),
      });
      if (response.ok) {
        const html = await response.text();
        image = meta(html, "og:image") || fallbackImage;
        sourceTitle = meta(html, "og:title");
        sourceDescription = meta(html, "og:description");
      }
    } catch {
      // Gemini can still analyze the fallback image when Facebook blocks its preview metadata.
    }
  }

  try {
    const recipe = await analyzeWithGemini(image, sourceTitle, sourceDescription);
    return NextResponse.json({ recipe: { ...recipe, image } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, string> = {
      MISSING_API_KEY: "Server chưa được cấu hình Gemini API key.",
      INVALID_API_KEY: "Gemini API key không hợp lệ hoặc chưa có quyền dùng model này.",
      QUOTA_EXCEEDED: "Gemini free tier đã hết quota. Hãy đợi quota được làm mới rồi thử lại.",
      IMAGE_DOWNLOAD_FAILED: "Không thể tải ảnh đại diện của video để phân tích.",
      INVALID_IMAGE: "Ảnh đại diện không đúng định dạng hoặc quá lớn.",
    };
    return NextResponse.json(
      { error: messages[code] || "Gemini chưa thể phân tích ảnh này. Hãy thử lại sau." },
      { status: code === "QUOTA_EXCEEDED" ? 429 : 502 },
    );
  }
}
