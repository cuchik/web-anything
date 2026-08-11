"use client";

import { Check } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/auth/credentials";

export function PasswordCriteria({ value }: { value: string }) {
  return (
    <ul className="password-criteria" aria-label="Yêu cầu mật khẩu">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li className={passed ? "is-met" : ""} key={rule.id}>
            {passed ? <Check size={13} strokeWidth={3} /> : <span className="criteria-dot" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
