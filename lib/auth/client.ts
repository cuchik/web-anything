type ApiErrorBody = { error?: { message?: string } };

const GENERIC_MESSAGE = "Có lỗi xảy ra, hãy thử lại.";

/** Single client entry point for auth mutations so error handling stays identical. */
export async function postAuth<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as (T & ApiErrorBody) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error?.message || GENERIC_MESSAGE);
  }
  return data;
}
