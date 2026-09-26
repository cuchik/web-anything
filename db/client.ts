import { ApplicationError } from "@/lib/errors/application-error";

export async function getDatabase() {
  const database = await getOptionalDatabase();
  if (!database) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      503,
      "Kho dữ liệu chưa được cấu hình trên server.",
    );
  }
  return database;
}

export async function getOptionalDatabase() {
  try {
    const { env } = await import("cloudflare:workers");
    return env.DB ?? null;
  } catch {
    return null;
  }
}
