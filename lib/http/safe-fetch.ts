import { ApplicationError } from "@/lib/errors/application-error";

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

type SafeFetchOptions = {
  isAllowedUrl: (url: URL) => boolean;
  init?: RequestInit;
  maxRedirects?: number;
  fetchImplementation?: typeof fetch;
};

export async function safeFetch(input: string | URL, options: SafeFetchOptions) {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const maxRedirects = options.maxRedirects ?? 3;
  let current = typeof input === "string" ? new URL(input) : new URL(input);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    if (!options.isAllowedUrl(current)) {
      throw new ApplicationError(
        "UNSAFE_UPSTREAM_URL",
        422,
        "Đường dẫn Facebook chuyển tới một địa chỉ không an toàn.",
      );
    }

    const response = await fetchImplementation(current, {
      ...options.init,
      redirect: "manual",
    });

    if (!redirectStatuses.has(response.status)) return response;

    const location = response.headers.get("location");
    if (!location || redirectCount === maxRedirects) {
      throw new ApplicationError(
        "TOO_MANY_REDIRECTS",
        422,
        "Facebook chuyển hướng quá nhiều lần. Hãy thử một link khác.",
      );
    }
    current = new URL(location, current);
  }

  throw new ApplicationError(
    "TOO_MANY_REDIRECTS",
    422,
    "Facebook chuyển hướng quá nhiều lần. Hãy thử một link khác.",
  );
}

export async function readBytesWithLimit(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApplicationError(
      "UPSTREAM_RESPONSE_TOO_LARGE",
      422,
      "Dữ liệu từ Facebook vượt quá giới hạn cho phép.",
    );
  }

  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ApplicationError(
        "UPSTREAM_RESPONSE_TOO_LARGE",
        422,
        "Dữ liệu từ Facebook vượt quá giới hạn cho phép.",
      );
    }
    chunks.push(value);
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readTextWithLimit(response: Response, maxBytes: number) {
  return new TextDecoder().decode(await readBytesWithLimit(response, maxBytes));
}
