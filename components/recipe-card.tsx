"use client";

import { Check, Clock3, Copy, Download, ExternalLink, Film, Flame, ImageIcon, Save, Users } from "lucide-react";
import { analysisLabel, confidenceLabels, recipeDisclaimer, type DisplayRecipe } from "@/lib/recipes/presentation";
import { useState } from "react";
import { RecipeExportDialog } from "@/components/recipe-export-dialog";

type RecipeCardProps = {
  recipe: DisplayRecipe;
  onCopy: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  onSave: () => void;
};

export function RecipeCard({ recipe, onCopy, saveLabel, saveDisabled = false, onSave }: RecipeCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [exportRecipe, setExportRecipe] = useState<DisplayRecipe | null>(null);
  const isVideoAnalysis = recipe.analysisMode === "video";
  return (
    <>
    <article className="recipe-card">
      <div className="dish-media">
        {/* Dynamic Facebook CDN URLs cannot use a stable Next image allowlist. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          hidden={imageFailed}
          onError={() => setImageFailed(true)}
          src={recipe.image}
          alt={`Ảnh đại diện của ${recipe.title}`}
          decoding="async"
          referrerPolicy="no-referrer"
        />
        {imageFailed && <p className="recipe-image-unavailable">Ảnh từ video không còn khả dụng</p>}
        <span className="frame-badge">
          {isVideoAnalysis ? <Film size={15} /> : <ImageIcon size={15} />}
          {analysisLabel(recipe)}
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
          <span>{recipe.promptVersion === "sample" ? "Công thức minh họa" : "Từ video Facebook"}</span>
          <small>
            {recipe.promptVersion === "sample" ? "Dữ liệu mẫu để khám phá giao diện" : isVideoAnalysis
              ? "Gemini lấy mẫu nhiều khung hình xuyên suốt video"
              : "Facebook không cung cấp video trực tiếp; AI dùng ảnh đại diện"}
          </small>
        </div>
      </div>

      <div className="recipe-content">
        <div className="recipe-title-row">
          <div>
            <h3>{recipe.title}</h3>
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

        <p className="ai-disclaimer">{recipeDisclaimer(recipe)}</p>

        <details className="analysis-details">
          <summary>Thông tin phân tích</summary>
          <span className={`confidence confidence-${recipe.confidenceBand}`}>
            Mức chắc chắn của AI: {confidenceLabels[recipe.confidenceBand]}
          </span>
          <div className="recipe-meta">
            <span><Clock3 size={17} /> {recipe.duration}</span>
            <span><Users size={17} /> {recipe.servings}</span>
            <span><Flame size={17} /> {recipe.calories}</span>
          </div>
          <div className="analysis-notes">
            <div><strong>AI nhìn thấy</strong><ul>{recipe.observations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
            <div><strong>AI đang ước tính</strong><ul>{recipe.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
          </div>
        </details>

        <div className="recipe-actions">
          <button className="primary-action" onClick={onSave} disabled={saveDisabled}>
            <Save size={17} /> {saveLabel}
          </button>
          <button className="secondary-action" onClick={onCopy}><Copy size={17} /> Sao chép</button>
          <button className="secondary-action" onClick={() => setExportRecipe(recipe)}><Download size={17} /> Tải ảnh</button>
        </div>
      </div>
    </article>
    {exportRecipe && <RecipeExportDialog recipe={exportRecipe} onClose={() => setExportRecipe(null)} />}
    </>
  );
}
