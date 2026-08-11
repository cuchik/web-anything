"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth-field";
import { postAuth } from "@/lib/auth/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await postAuth<{ message: string }>("/api/auth/forgot-password", { email });
      setNotice(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể gửi yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (notice) {
    return (
      <p className="auth-notice" role="status">
        <Check size={16} /> {notice}
      </p>
    );
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
      <AuthField
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        maxLength={254}
        disabled={isSubmitting}
      />

      {message && <p className="auth-error" role="alert">{message}</p>}

      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <><LoaderCircle className="spin" size={17} /> Đang gửi</>
        ) : (
          "Gửi liên kết đặt lại"
        )}
      </button>
    </form>
  );
}
