import { z } from "zod";
import { TOKEN_PATTERN } from "@/lib/auth/token";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;

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
  .min(MIN_PASSWORD_LENGTH, `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`)
  .max(MAX_PASSWORD_LENGTH, "Mật khẩu quá dài.");

export const authTokenSchema = z.string().trim().regex(TOKEN_PATTERN, "Mã không hợp lệ.");

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

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
