"use client";

import {
  ArrowRight,
  Check,
  ChefHat,
  Clock3,
  Copy,
  Flame,
  ImageIcon,
  Link2,
  LoaderCircle,
  Play,
  Save,
  Sparkles,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Recipe = {
  title: string;
  subtitle: string;
  image: string;
  duration: string;
  servings: string;
  calories: string;
  ingredients: string[];
  steps: string[];
};

const sampleRecipe: Recipe = {
  title: "Bò sốt tiêu đen",
  subtitle: "Thịt bò mềm mọng, sốt tiêu thơm nồng",
  image:
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88",
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
};

const stages = ["Đang mở video", "Chọn khung hình đẹp nhất", "Đọc món ăn"];

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [stage, setStage] = useState(0);
  const [recipe, setRecipe] = useState<Recipe>(sampleRecipe);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setInterval(
      () => setStage((current) => Math.min(current + 1, stages.length - 1)),
      650,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  async function analyze(videoUrl: string) {
    if (!videoUrl.trim()) {
      setMessage("Hãy dán một đường link Facebook trước nhé.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setStage(0);
    setMessage("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl.trim() }),
      });
      const data = (await response.json()) as { recipe?: Recipe; error?: string };
      if (!response.ok || !data.recipe) throw new Error(data.error || "Không thể đọc video");
      setRecipe(data.recipe);
      setTimeout(() => setStatus("done"), 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra, hãy thử lại.");
      setStatus("error");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void analyze(url);
  }

  function trySample() {
    const sampleUrl = "https://www.facebook.com/reel/1234567890";
    setUrl(sampleUrl);
    void analyze(sampleUrl);
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 1800);
  }

  function copyRecipe() {
    const text = `${recipe.title}\n\nNguyên liệu:\n${recipe.ingredients
      .map((item) => `• ${item}`)
      .join("\n")}\n\nCách làm:\n${recipe.steps
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n")}`;
    void navigator.clipboard.writeText(text);
    showToast("Đã sao chép công thức");
  }

  const showResult = status === "done";

  return (
    <main>
      <nav className="nav-shell">
        <a className="brand" href="#top" aria-label="Bếp Từ Video - trang chủ">
          <span className="brand-mark"><ChefHat size={21} strokeWidth={2.2} /></span>
          <span>Bếp Từ Video</span>
        </a>
        <div className="nav-actions">
          <span className="beta-pill"><Sparkles size={13} /> AI beta</span>
          <button className="saved-button" onClick={() => showToast("Chưa có công thức đã lưu")}>
            <Save size={17} /> <span>Công thức đã lưu</span>
          </button>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-content">
          <div className="eyebrow"><span /> Từ video thành bữa ngon</div>
          <h1>Thấy món ngon trên Facebook?<br /><em>Mang công thức về đây.</em></h1>
          <p className="hero-lead">
            Dán link Reel hoặc video. Bếp AI sẽ chọn khung hình đẹp nhất,
            nhận diện món ăn và viết lại công thức dễ làm cho bạn.
          </p>

          <form className={`url-box ${status === "error" ? "has-error" : ""}`} onSubmit={onSubmit}>
            <div className="url-row">
              <span className="facebook-icon" aria-hidden="true">f</span>
              <input
                type="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="Dán link facebook.com/reel/..."
                aria-label="Link video Facebook"
              />
              <button className="analyze-button" type="submit" disabled={status === "loading"}>
                {status === "loading" ? (
                  <><LoaderCircle className="spin" size={18} /> Đang đọc</>
                ) : (
                  <>Lấy công thức <ArrowRight size={18} /></>
                )}
              </button>
            </div>
            {status === "loading" && (
              <div className="progress-row">
                {stages.map((item, index) => (
                  <span className={index <= stage ? "active" : ""} key={item}>
                    {index < stage ? <Check size={13} /> : <span className="step-dot" />}
                    {item}
                  </span>
                ))}
              </div>
            )}
          </form>
          {status === "error" && <p className="error-message">{message}</p>}

          <button className="sample-button" type="button" onClick={trySample} disabled={status === "loading"}>
            <Play size={15} fill="currentColor" /> Chưa có link? Xem thử với video mẫu
          </button>

          <div className="trust-row">
            <div><ImageIcon size={18} /><span><strong>Tự chọn ảnh chính</strong>Không cần chụp màn hình</span></div>
            <div><Sparkles size={18} /><span><strong>Công thức rõ ràng</strong>Nguyên liệu & từng bước</span></div>
            <div><Clock3 size={18} /><span><strong>Chỉ mất vài giây</strong>Lưu lại để nấu sau</span></div>
          </div>
        </div>
      </section>

      <section className={`result-section ${showResult ? "is-visible" : ""}`} aria-live="polite">
        <div className="section-heading">
          <span className="section-kicker"><Sparkles size={14} /> Bếp AI đã tìm thấy</span>
          <h2>{showResult ? "Công thức từ video của bạn" : "Một video. Một công thức hoàn chỉnh."}</h2>
          <p>{showResult ? "Bạn có thể chỉnh lại định lượng theo khẩu phần mong muốn." : "Đây là kết quả mẫu — hãy dán link của bạn để bắt đầu."}</p>
        </div>

        <article className="recipe-card">
          <div className="dish-media">
            <img src={recipe.image} alt={recipe.title} />
            <span className="frame-badge"><ImageIcon size={15} /> Khung hình chính</span>
            <button className="play-overlay" type="button" aria-label="Xem lại video"><Play size={22} fill="currentColor" /></button>
            <div className="media-caption"><span>Từ video Facebook</span><small>Phân tích khung hình nổi bật</small></div>
          </div>

          <div className="recipe-content">
            <div className="recipe-title-row">
              <div>
                <span className="confidence"><span /> Độ tin cậy 92%</span>
                <h3>{recipe.title}</h3>
                <p>{recipe.subtitle}</p>
              </div>
              <button className="icon-button" onClick={copyRecipe} aria-label="Sao chép công thức" title="Sao chép công thức"><Copy size={18} /></button>
            </div>

            <div className="recipe-meta">
              <span><Clock3 size={17} /> {recipe.duration}</span>
              <span><Users size={17} /> {recipe.servings}</span>
              <span><Flame size={17} /> {recipe.calories}</span>
            </div>

            <div className="recipe-grid">
              <div>
                <h4>Nguyên liệu</h4>
                <ul>{recipe.ingredients.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul>
              </div>
              <div>
                <h4>Cách làm</h4>
                <ol>{recipe.steps.map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}</ol>
              </div>
            </div>

            <div className="recipe-actions">
              <button className="primary-action" onClick={() => showToast("Đã lưu vào sổ công thức")}><Save size={17} /> Lưu công thức</button>
              <button className="secondary-action" onClick={copyRecipe}><Copy size={17} /> Sao chép</button>
            </div>
          </div>
        </article>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><ChefHat size={19} /></span>Bếp Từ Video</a>
        <p>Món ngon lướt thấy, công thức mang về.</p>
        <span>Made with a pinch of AI ✦</span>
      </footer>

      {toast && <div className="toast"><Check size={16} /> {toast}</div>}
    </main>
  );
}
