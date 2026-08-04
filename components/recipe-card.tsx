import { Check, Clock3, Copy, ExternalLink, Film, Flame, ImageIcon, Save, Users } from "lucide-react";
import type { RecipeAnalysis } from "@/lib/recipes/schema";

export type DisplayRecipe = RecipeAnalysis & {
  analysisMode: "video" | "thumbnail";
  image: string;
  sourceUrl: string;
  promptVersion: string;
};

const confidenceLabels = {
  low: "Thấp — nên kiểm tra lại món",
  medium: "Trung bình",
  high: "Cao",
} as const;

type RecipeCardProps = {
  recipe: DisplayRecipe;
  onCopy: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  onSave: () => void;
};

export function RecipeCard({ recipe, onCopy, saveLabel, saveDisabled = false, onSave }: RecipeCardProps) {
  const isVideoAnalysis = recipe.analysisMode === "video";
  return (
    <article className="recipe-card">
      <div className="dish-media">
        {/* Dynamic Facebook CDN URLs cannot use a stable Next image allowlist. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={recipe.image}
          alt={`Ảnh đại diện Facebook được dùng để ước tính món ${recipe.title}`}
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <span className="frame-badge">
          {isVideoAnalysis ? <Film size={15} /> : <ImageIcon size={15} />}
          {isVideoAnalysis ? "Phân tích video đa khung hình" : "Fallback ảnh đại diện"}
        </span>
        {recipe.promptVersion === "sample" ? (
          <span className="play-overlay sample-overlay" aria-label="Kết quả minh họa">
            <ImageIcon size={22} />
          </span>
        ) : (
          <a
            className="play-overlay"
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Mở video gốc trên Facebook"
            title="Mở video gốc trên Facebook"
          >
            <ExternalLink size={22} />
          </a>
        )}
        <div className="media-caption">
          <span>Từ video Facebook</span>
          <small>
            {isVideoAnalysis
              ? "Gemini lấy mẫu nhiều khung hình xuyên suốt video"
              : "Facebook không cung cấp video trực tiếp; AI dùng ảnh đại diện"}
          </small>
        </div>
      </div>

      <div className="recipe-content">
        <div className="recipe-title-row">
          <div>
            <span className={`confidence confidence-${recipe.confidenceBand}`}>
              <span /> Mức chắc chắn của AI: {confidenceLabels[recipe.confidenceBand]}
            </span>
            <h3>{recipe.title}</h3>
            <p>{recipe.subtitle}</p>
          </div>
          <button className="icon-button" onClick={onCopy} aria-label="Sao chép công thức" title="Sao chép công thức">
            <Copy size={18} />
          </button>
        </div>

        <div className="recipe-meta">
          <span><Clock3 size={17} /> {recipe.duration}</span>
          <span><Users size={17} /> {recipe.servings}</span>
          <span><Flame size={17} /> {recipe.calories}</span>
        </div>

        <div className="analysis-notes">
          <div>
            <strong>AI nhìn thấy</strong>
            <ul>{recipe.observations.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <strong>AI đang ước tính</strong>
            <ul>{recipe.assumptions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>

        <div className="recipe-grid">
          <div>
            <h4>Nguyên liệu ước tính</h4>
            <ul>{recipe.ingredients.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul>
          </div>
          <div>
            <h4>Cách làm gợi ý</h4>
            <ol>{recipe.steps.map((item, index) => <li key={`${index}-${item}`}><span>{index + 1}</span><p>{item}</p></li>)}</ol>
          </div>
        </div>

        {recipe.warnings.length > 0 && (
          <div className="recipe-warning" role="note">
            <strong>Lưu ý:</strong> {recipe.warnings.join(" ")}
          </div>
        )}

        <p className="ai-disclaimer">
          {isVideoAnalysis
            ? "Công thức được AI tổng hợp từ các khung hình trong video. "
            : "Công thức được AI ước tính từ ảnh đại diện. "}
          Hãy kiểm tra nguyên liệu, dị ứng và độ chín an toàn trước khi dùng.
        </p>

        <div className="recipe-actions">
          <button className="primary-action" onClick={onSave} disabled={saveDisabled}>
            <Save size={17} /> {saveLabel}
          </button>
          <button className="secondary-action" onClick={onCopy}><Copy size={17} /> Sao chép</button>
        </div>
      </div>
    </article>
  );
}
