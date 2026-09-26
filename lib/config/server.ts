import { z } from "zod";
import { ApplicationError } from "@/lib/errors/application-error";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().trim().optional(),
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().regex(/^[a-zA-Z0-9._-]+$/).default("gemini-3.6-flash"),
  USER_ID_PEPPER: z.string().trim().optional(),
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
  PASSWORD_HASH_ITERATIONS: z.coerce.number().int().min(100_000).max(1_000_000).default(210_000),
});

/** Read lazily: Workers bindings become available at request time, not build time. */
export function getServerConfig() {
  const parsed = schema.safeParse(Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value?.trim() || undefined]),
  ));
  if (!parsed.success) throw new ApplicationError("INVALID_SERVER_CONFIG", 503, "Cấu hình server chưa hợp lệ.");
  return parsed.data;
}

export function getAppOrigin() {
  const config = getServerConfig();
  const raw = config.APP_URL || (config.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  try {
    const url = new URL(raw);
    const local = config.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
        url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    return url.origin;
  } catch {
    throw new ApplicationError("INVALID_APP_URL", 503, "Hãy cấu hình APP_URL bằng origin tin cậy của ứng dụng.");
  }
}
