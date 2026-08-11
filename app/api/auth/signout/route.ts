import { endSession } from "@/lib/auth/session";
import { apiErrorResponse, noStoreJson } from "@/lib/http/api-response";
import { assertSameOrigin, isSecureRequest } from "@/lib/http/request-origin";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const cookie = await endSession(isSecureRequest(request));
    const response = noStoreJson({ signedOut: true });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}
