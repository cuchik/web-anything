"use client";

import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth-field";
import { PasswordCriteria } from "@/components/password-criteria";
import { postAuth } from "@/lib/auth/client";
import { failedPasswordRules, MAX_PASSWORD_LENGTH } from "@/lib/auth/credentials";

export function SignUpForm({ returnTo }: { returnTo: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const isPasswordValid = failedPasswordRules(password).length === 0;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      await postAuth("/api/auth/signup", { username, password });
      window.location.assign(returnTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo tài khoản.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
      <AuthField
        label="Tên đăng nhập"
        name="username"
        value={username}
        onChange={setUsername}
        autoComplete="username"
        hint="3–32 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang."
        minLength={3}
        maxLength={32}
        disabled={isSubmitting}
      />
      <AuthField
        label="Mật khẩu"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        maxLength={MAX_PASSWORD_LENGTH}
        disabled={isSubmitting}
      />
      <PasswordCriteria value={password} />

      {message && <p className="auth-error" role="alert">{message}</p>}

      <button className="auth-submit" type="submit" disabled={isSubmitting || !isPasswordValid}>
        {isSubmitting ? (
          <><LoaderCircle className="spin" size={17} /> Đang tạo tài khoản</>
        ) : (
          "Tạo tài khoản"
        )}
      </button>
    </form>
  );
}
