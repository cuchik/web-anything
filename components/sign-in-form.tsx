"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth-field";
import { postAuth } from "@/lib/auth/client";
import { MAX_PASSWORD_LENGTH } from "@/lib/auth/credentials";

export function SignInForm({ returnTo }: { returnTo: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      await postAuth("/api/auth/signin", { username, password });
      window.location.assign(returnTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đăng nhập.");
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
        maxLength={64}
        disabled={isSubmitting}
      />
      <AuthField
        label="Mật khẩu"
        name="password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        maxLength={MAX_PASSWORD_LENGTH}
        disabled={isSubmitting}
      />

      {message && <p className="auth-error" role="alert">{message}</p>}

      <button className="auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <><LoaderCircle className="spin" size={17} /> Đang đăng nhập</>
        ) : (
          "Đăng nhập"
        )}
      </button>

      <Link className="auth-inline-link" href="/forgot-password">Quên mật khẩu?</Link>
    </form>
  );
}
