import { z } from "zod";
import { TOKEN_PATTERN } from "@/lib/auth/token";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

/**
 * Single source of truth for password strength: the schema below and the
 * checklist shown while typing are both derived from this list.
 */
export const PASSWORD_RULES = [
  { id: "length", label: `Từ ${MIN_PASSWORD_LENGTH} ký tự trở lên`, test: (value: string) => value.length >= MIN_PASSWORD_LENGTH },
  { id: "lowercase", label: "Có chữ thường (a–z)", test: (value: string) => /[a-z]/.test(value) },
  { id: "uppercase", label: "Có chữ hoa (A–Z)", test: (value: string) => /[A-Z]/.test(value) },
  { id: "digit", label: "Có chữ số (0–9)", test: (value: string) => /[0-9]/.test(value) },
  { id: "special", label: "Có ký tự đặc biệt (!@#$…)", test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
] as const;

export function failedPasswordRules(value: string) {
  return PASSWORD_RULES.filter((rule) => !rule.test(value));
}

/** Lowercases only the leading letter, so ranges like `A–Z` survive. */
function asClause(label: string) {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Tên đăng nhập cần ít nhất 3 ký tự.")
  .max(32, "Tên đăng nhập tối đa 32 ký tự.")
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang và phải bắt đầu bằng chữ hoặc số.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email quá dài.")
  .email("Email không hợp lệ.");

export const passwordSchema = z
  .string()
  .max(MAX_PASSWORD_LENGTH, "Mật khẩu quá dài.")
  .superRefine((value, context) => {
    const failed = failedPasswordRules(value);
    if (failed.length === 0) return;

    context.addIssue({
      code: "custom",
      message: `Mật khẩu chưa đạt: ${failed.map((rule) => asClause(rule.label)).join("; ")}.`,
    });
  });

export const authTokenSchema = z.string().trim().regex(TOKEN_PATTERN, "Mã không hợp lệ.");

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** Email is added after sign-in, not at registration. */
export const setEmailSchema = z.object({ email: emailSchema });

/** Sign-in never applies format rules, so an invalid username cannot be told apart from a wrong one. */
export const signInSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: authTokenSchema,
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: authTokenSchema });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
