"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth-field";
import { postAuth } from "@/lib/auth/client";

type AccountEmailFormProps = {
  currentEmail: string | null;
  emailVerified: boolean;
};

export function AccountEmailForm({ currentEmail, emailVerified }: AccountEmailFormProps) {
  const [email, setEmail] = useState(currentEmail ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setNotice("");
    try {
      const result = await postAuth<{ verificationEmailSent: boolean }>("/api/auth/email", {
        email,
      });
      setNotice(
        result.verificationEmailSent
          ? "Đã lưu email và gửi liên kết xác minh. Hãy kiểm tra hộp thư."
          : "Đã lưu email, nhưng chưa gửi được liên kết xác minh. Hãy thử lại sau.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được email.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
      {currentEmail && (
        <p className="account-status">
          Email hiện tại: <strong>{currentEmail}</strong>{" "}
          {emailVerified ? "— đã xác minh" : "— chưa xác minh"}
        </p>
      )}

      <AuthField
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        hint="Chỉ dùng để đặt lại mật khẩu. Đổi email sẽ cần xác minh lại."
        maxLength={254}
        disabled={isSubmitting}
      />

      {message && <p className="auth-error" role="alert">{message}</p>}
      {notice && (
        <p className="auth-notice" role="status">
          <Check size={16} /> {notice}
        </p>
      )}

      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <><LoaderCircle className="spin" size={17} /> Đang lưu</>
        ) : currentEmail ? (
          "Cập nhật email"
        ) : (
          "Lưu email"
        )}
      </button>
    </form>
  );
}
