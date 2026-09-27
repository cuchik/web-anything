import { analysisLabel, recipeDisclaimer, type DisplayRecipe } from "@/lib/recipes/presentation";
import { wrapText } from "@/lib/recipes/export-layout";

const WIDTH = 1200;
const PAD = 64;
const INK = "#19392f";
const MUTED = "#50675c";
const CORAL = "#bd624c";

type TextBlock = { lines: string[]; font: string; lineHeight: number; height: number };

export async function loadExportImage(recipe: DisplayRecipe, signal: AbortSignal) {
  const response = await fetch("/api/recipe-image", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: recipe.image }), signal,
  });
  if (!response.ok) throw new Error("Không tải được ảnh từ video. Ảnh có thể đã hết hạn hoặc nguồn ảnh tạm thời không khả dụng.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 25_000_000) throw new Error("Ảnh nguồn quá lớn. Hãy xuất bản chỉ có chữ.");
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draw a dedicated, bounded print layout. Preview and download use this exact PNG. */
export async function createRecipePng(recipe: DisplayRecipe, image: HTMLImageElement | null): Promise<Blob> {
  const styles = getComputedStyle(document.body);
  const sans = styles.getPropertyValue("--font-sans").trim() || "sans-serif";
  const serif = styles.getPropertyValue("--font-serif").trim() || "serif";
  await Promise.all([
    document.fonts.load(`400 26px ${sans}`),
    document.fonts.load(`600 22px ${sans}`),
    document.fonts.load(`700 66px ${serif}`),
  ]);
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ tạo ảnh. Hãy thử trình duyệt khác.");
  function block(text: string, width: number, font: string, lineHeight: number): TextBlock {
    ctx!.font = font;
    const lines = wrapText(text, width, (value) => ctx!.measureText(value).width);
    return { lines, font, lineHeight, height: lines.length * lineHeight };
  }
  const bodyFont = `400 26px ${sans}`;
  const smallFont = `400 20px ${sans}`;
  const labelFont = `600 22px ${sans}`;
  const title = block(recipe.title, image ? 672 : WIDTH - PAD * 2, `700 66px ${serif}`, 70);
  const mode = block(analysisLabel(recipe), image ? 672 : WIDTH - PAD * 2, smallFont, 30);
  const headerHeight = Math.max(title.height + mode.height + 110, image ? 330 : 0);
  const bodyY = PAD + headerHeight + 48;
  const ingredients = recipe.ingredients.map((text) => block(text, 300, bodyFont, 39));
  const steps = recipe.steps.map((text) => block(text, 620, bodyFont, 39));
  const ingredientsHeight = ingredients.reduce((height, item) => height + item.height + 22, 0);
  const stepsHeight = steps.reduce((height, item) => height + item.height + 26, 0);
  const footerY = bodyY + 62 + Math.max(ingredientsHeight, stepsHeight) + 24;
  const warnings = recipe.warnings.map((text) => block(`• ${text}`, WIDTH - PAD * 2 - 48, smallFont, 31));
  const warningHeight = warnings.length ? 66 + warnings.reduce((height, item) => height + item.height + 10, 0) : 0;
  const disclaimer = block(recipeDisclaimer(recipe), WIDTH - PAD * 2, smallFont, 31);
  const height = Math.ceil(footerY + warningHeight + disclaimer.height + 112);
  // Bounded well below common mobile canvas area limits (16 megapixels).
  if (height > 10_000) throw new Error("Công thức quá dài để xuất thành một ảnh. Hãy dùng Sao chép để giữ đầy đủ nội dung.");
  canvas.width = WIDTH;
  canvas.height = height;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = "#225a47";
  ctx.fillRect(0, 0, WIDTH, 12);
  ctx.textBaseline = "top";
  function draw(item: TextBlock, x: number, y: number, color = INK) {
    ctx!.font = item.font;
    ctx!.fillStyle = color;
    item.lines.forEach((line, index) => ctx!.fillText(line, x, y + index * item.lineHeight));
  }
  function label(text: string, x: number, y: number, color = INK) {
    ctx!.font = labelFont;
    ctx!.fillStyle = color;
    ctx!.fillText(text, x, y);
  }
  label("BẾP TỪ VIDEO  /  SỔ CÔNG THỨC", PAD, PAD, CORAL);
  draw(title, PAD, PAD + 56);
  draw(mode, PAD, PAD + 72 + title.height, MUTED);
  if (image) {
    const x = 800, y = PAD, boxWidth = 336, boxHeight = 330;
    ctx.fillStyle = "#f1f5f1";
    ctx.beginPath(); ctx.roundRect(x, y, boxWidth, boxHeight, 20); ctx.fill();
    const scale = Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.save(); ctx.clip();
    ctx.drawImage(image, x + (boxWidth - w) / 2, y + (boxHeight - h) / 2, w, h);
    ctx.restore();
  }
  ctx.strokeStyle = "#dce6df";
  ctx.beginPath(); ctx.moveTo(PAD, bodyY - 24); ctx.lineTo(WIDTH - PAD, bodyY - 24); ctx.stroke();
  label("NGUYÊN LIỆU", PAD, bodyY);
  label("CÁCH LÀM", 464, bodyY);
  let y = bodyY + 62;
  ingredients.forEach((item) => {
    ctx.fillStyle = "#80a893";
    ctx.beginPath(); ctx.arc(PAD + 5, y + 14, 5, 0, Math.PI * 2); ctx.fill();
    draw(item, PAD + 26, y, MUTED);
    y += item.height + 22;
  });
  y = bodyY + 62;
  steps.forEach((item, index) => {
    ctx.fillStyle = "#f7e8e2";
    ctx.beginPath(); ctx.roundRect(464, y - 2, 38, 38, 11); ctx.fill();
    label(String(index + 1), 475, y + 4, CORAL);
    draw(item, 516, y, MUTED);
    y += item.height + 26;
  });
  if (warnings.length) {
    ctx.fillStyle = "#fff5e7";
    ctx.beginPath(); ctx.roundRect(PAD, footerY, WIDTH - PAD * 2, warningHeight, 16); ctx.fill();
    label("LƯU Ý", PAD + 24, footerY + 20, "#71572e");
    y = footerY + 62;
    warnings.forEach((item) => { draw(item, PAD + 24, y, "#71572e"); y += item.height + 10; });
  }
  draw(disclaimer, PAD, footerY + warningHeight + 28, MUTED);
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Không thể tạo PNG. Hãy thử lại.")), "image/png",
  ));
}
