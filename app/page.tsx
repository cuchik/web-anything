"use client";

import {
  ArrowRight,
  Check,
  ChefHat,
  ImageIcon,
  LoaderCircle,
  Play,
  Save,
  Sparkles,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { RecipeCard, type DisplayRecipe } from "@/components/recipe-card";
import type { SavedRecipe } from "@/lib/recipes/saved-recipe";

type SessionState = {
  authenticated: boolean;
  displayName: string | null;
  signInPath: string;
};

const sampleRecipe: DisplayRecipe = {
  isFood: true,
  analysisMode: "thumbnail",
  title: "Rau củ hầm kiểu nhà",
  subtitle: "Rau củ mềm ngọt trong nước dùng thanh nhẹ",
  image:
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=88",
  duration: "30 phút",
  servings: "2 người",
  calories: "~280 kcal",
  confidence: 74,
  confidenceBand: "medium",
  observations: ["Có nhiều loại rau củ trong một món nước", "Món có dạng hầm hoặc nấu canh"],
  assumptions: ["Gia vị và định lượng không thể xác định chính xác từ ảnh", "Các bước dưới đây là gợi ý để nấu tại nhà"],
  ingredients: [
    "2 củ khoai tây",
    "2 củ cà rốt",
    "1/2 củ hành tây",
    "200g cà chua",
    "Nước dùng, muối và tiêu",
  ],
  steps: [
    "Rửa sạch, gọt vỏ rồi cắt rau củ thành miếng vừa ăn.",
    "Xào hành tây và cà chua đến khi dậy mùi.",
    "Thêm khoai tây, cà rốt và nước dùng; hầm đến khi rau củ mềm.",
    "Nêm muối, tiêu theo khẩu vị rồi dùng nóng.",
  ],
  warnings: ["Đây là dữ liệu minh họa, không phải kết quả phân tích một video thật."],
  sourceUrl: "https://www.facebook.com/reel/1234567890",
  promptVersion: "sample",
};

const stages = ["Kiểm tra link", "Đọc video đa khung hình", "AI tổng hợp công thức"];

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [stage, setStage] = useState(0);
  const [recipe, setRecipe] = useState<DisplayRecipe>(sampleRecipe);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setInterval(
      () => setStage((current) => Math.min(current + 1, stages.length - 1)),
      650,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const nextSession = (await response.json()) as SessionState;
        if (!active) return;
        setSession(nextSession);
        if (nextSession.authenticated) {
          const recipesResponse = await fetch("/api/recipes", { cache: "no-store" });
          if (recipesResponse.ok) {
            const data = (await recipesResponse.json()) as { recipes: SavedRecipe[] };
            if (active) setSavedRecipes(data.recipes);
          }
        }
      } catch {
        if (active) setSession({ authenticated: false, displayName: null, signInPath: "/signin-with-chatgpt?return_to=%2F" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
      const data = (await response.json()) as {
        recipe?: DisplayRecipe;
        error?: { message?: string };
      };
      if (!response.ok || !data.recipe) {
        throw new Error(data.error?.message || "Không thể phân tích video này");
      }
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
    setRecipe(sampleRecipe);
    setStatus("done");
    setMessage("");
    window.setTimeout(() => {
      document.querySelector(".result-section")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  }

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function copyRecipe() {
    const text = `${recipe.title}\n\nNguyên liệu:\n${recipe.ingredients
      .map((item) => `• ${item}`)
      .join("\n")}\n\nCách làm:\n${recipe.steps
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Đã sao chép công thức");
    } catch {
      showToast("Không thể sao chép. Hãy cấp quyền clipboard rồi thử lại.");
    }
  }

  function openSavedRecipes() {
    if (!session?.authenticated) {
      window.location.assign(session?.signInPath || "/signin-with-chatgpt?return_to=%2F");
      return;
    }
    document.querySelector("#saved-recipes")?.scrollIntoView({ behavior: "smooth" });
  }

  async function saveRecipe() {
    if (!session?.authenticated) {
      window.location.assign(session?.signInPath || "/signin-with-chatgpt?return_to=%2F");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      const data = (await response.json()) as { recipe?: SavedRecipe; error?: { message?: string } };
      if (!response.ok || !data.recipe) throw new Error(data.error?.message || "Không thể lưu công thức");
      setSavedRecipes((current) => [data.recipe!, ...current.filter((item) => item.id !== data.recipe!.id)]);
      showToast("Đã lưu vào sổ công thức");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể lưu công thức");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSavedRecipe(id: string) {
    const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      showToast("Không thể xóa công thức");
      return;
    }
    setSavedRecipes((current) => current.filter((item) => item.id !== id));
    showToast("Đã xóa công thức");
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
          <button className="saved-button" onClick={openSavedRecipes}>
            <Save size={17} /> <span>{session?.authenticated ? `Đã lưu (${savedRecipes.length})` : "Đăng nhập để lưu"}</span>
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
            Dán link Reel hoặc video công khai. Bếp AI sẽ đọc nhiều khung hình,
            nhận diện các bước nấu và viết một công thức gợi ý cho bạn.
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
          <p className="privacy-note">
            Khi bạn phân tích, video hoặc ảnh đại diện cùng mô tả công khai được gửi tạm thời tới Google Gemini.
            Không nhập link riêng tư hoặc nội dung nhạy cảm.
          </p>

          <button className="sample-button" type="button" onClick={trySample} disabled={status === "loading"}>
            <Play size={15} fill="currentColor" /> Chưa có link? Xem thử với video mẫu
          </button>

          <div className="trust-row">
            <div><ImageIcon size={18} /><span><strong>Đọc đa khung hình</strong>Theo dõi món ăn xuyên suốt video</span></div>
            <div><Sparkles size={18} /><span><strong>Phân biệt suy đoán</strong>Biết điều gì AI chưa chắc</span></div>
            <div><Check size={18} /><span><strong>Công thức gợi ý</strong>Kiểm tra lại trước khi nấu</span></div>
          </div>
        </div>
      </section>

      <section className={`result-section ${showResult ? "is-visible" : ""}`} aria-live="polite">
        <div className="section-heading">
          <span className="section-kicker"><Sparkles size={14} /> Bếp AI đã tìm thấy</span>
          <h2>{showResult ? "Công thức từ video của bạn" : "Một video. Một công thức hoàn chỉnh."}</h2>
          <p>
            {showResult
              ? recipe.analysisMode === "video"
                ? "Kết quả được tổng hợp từ nhiều khung hình và vẫn có thể cần bạn điều chỉnh."
                : "Facebook không cung cấp video trực tiếp, nên kết quả này được ước tính từ ảnh đại diện."
              : "Đây là kết quả mẫu — hãy dán link của bạn để bắt đầu."}
          </p>
        </div>

        <RecipeCard
          recipe={recipe}
          onCopy={() => void copyRecipe()}
          saveLabel={isSaving ? "Đang lưu…" : session?.authenticated ? "Lưu công thức" : "Đăng nhập để lưu"}
          saveDisabled={isSaving}
          onSave={() => void saveRecipe()}
        />
      </section>

      {session?.authenticated && (
        <section className="saved-section" id="saved-recipes" aria-labelledby="saved-title">
          <div className="section-heading">
            <span className="section-kicker"><Save size={14} /> Sổ công thức của bạn</span>
            <h2 id="saved-title">Công thức đã lưu</h2>
            <p>{session.displayName ? `Đang đăng nhập với ${session.displayName}` : "Các công thức gắn với tài khoản ChatGPT của bạn."}</p>
          </div>
          {savedRecipes.length === 0 ? (
            <p className="saved-empty">Bạn chưa lưu công thức nào.</p>
          ) : (
            <div className="saved-grid">
              {savedRecipes.map((item) => (
                <article className="saved-card" key={item.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{new Intl.DateTimeFormat("vi-VN").format(item.createdAt)}</p>
                    <div>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">Video gốc</a>
                      <button type="button" onClick={() => void removeSavedRecipe(item.id)}>Xóa</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark"><ChefHat size={19} /></span>Bếp Từ Video</a>
        <p>Món ngon lướt thấy, công thức mang về.</p>
        <span>Made with a pinch of AI ✦</span>
      </footer>

      {toast && <div className="toast" role="status" aria-live="polite"><Check size={16} /> {toast}</div>}
    </main>
  );
}
