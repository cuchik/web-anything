"use client";

import { Download, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recipeFilename, type DisplayRecipe } from "@/lib/recipes/presentation";

type Props = { recipe: DisplayRecipe; onClose: () => void };

export function RecipeExportDialog({ recipe, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [textOnly, setTextOnly] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let objectUrl: string | undefined;
    void (async () => {
      try {
        const { loadExportImage, createRecipePng } = await import("@/lib/recipes/export-png");
        let image: HTMLImageElement | null = null;
        if (!textOnly) {
          try { image = await loadExportImage(recipe, controller.signal); }
          catch (failure) {
            if (active) setImageFailed(true);
            throw failure;
          }
        }
        if (!active) return;
        const blob = await createRecipePng(recipe, image);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview(objectUrl);
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Không thể tạo ảnh. Hãy thử lại.");
      }
    })();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [recipe, attempt, textOnly]);

  function regenerate(withoutImage: boolean) {
    setPreview(null); setError(""); setImageFailed(false);
    setTextOnly(withoutImage); setAttempt((value) => value + 1);
  }

  return (
    <dialog ref={dialog} className="export-dialog" aria-labelledby="export-title" onCancel={onClose}>
      <div className="export-toolbar">
        <div><h2 id="export-title">Ảnh công thức</h2><p>{textOnly ? "Bản chỉ có chữ · PNG" : "Xem trước bản tải xuống · PNG"}</p></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng bản xem trước"><X size={20} /></button>
      </div>
      <div className="export-preview" aria-busy={!preview && !error}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`Bản xuất công thức ${recipe.title}: đầy đủ nguyên liệu, cách làm và lưu ý`} />
        ) : error ? (
          <div className="export-status" role="alert">
            <p>{error}</p>
            <button className="secondary-action" onClick={() => regenerate(textOnly)}>Thử lại</button>
            {imageFailed && <button className="secondary-action" onClick={() => regenerate(true)}>Xuất bản chỉ có chữ</button>}
          </div>
        ) : <p className="export-status" role="status"><LoaderCircle className="spin" size={22} /> Đang tạo ảnh công thức…</p>}
      </div>
      <div className="export-footer">
        <span>Đầy đủ nội dung · Không có nút thao tác</span>
        {preview ? <a className="primary-action" href={preview} download={recipeFilename(recipe.title)}><Download size={17} /> Tải PNG</a>
          : <button className="primary-action" disabled><Download size={17} /> Tải PNG</button>}
      </div>
    </dialog>
  );
}
