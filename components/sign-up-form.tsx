"use client";

import { LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth-field";
import { postAuth } from "@/lib/auth/client";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";

export function SignUpForm({ returnTo }: { returnTo: string }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Hai lần nhập mật khẩu chưa khớp.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      await postAuth("/api/auth/signup", { username, email, password });
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
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        hint="Chỉ dùng để xác minh tài khoản và đặt lại mật khẩu."
        maxLength={254}
        disabled={isSubmitting}
      />
      <AuthField
        label="Mật khẩu"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        disabled={isSubmitting}
      />
      <AuthField
        label="Nhập lại mật khẩu"
        name="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        disabled={isSubmitting}
      />

      {message && <p className="auth-error" role="alert">{message}</p>}

      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <><LoaderCircle className="spin" size={17} /> Đang tạo tài khoản</>
        ) : (
          "Tạo tài khoản"
        )}
      </button>
    </form>
  );
}
