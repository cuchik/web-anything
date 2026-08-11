import { ApplicationError } from "@/lib/errors/application-error";

export async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      503,
      "Kho dữ liệu chưa được cấu hình trên server.",
    );
  }
  return env.DB;
}
