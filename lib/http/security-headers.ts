export function securityHeaders(secure: boolean) {
  const csp = [
    "default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "object-src 'none'",
    "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
    "img-src 'self' data: blob: https://*.fbcdn.net https://*.fbsbx.com https://*.facebook.com https://images.unsplash.com",
    "connect-src 'self'", ...(secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...(secure ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
  };
}

export function withSecurityHeaders(response: Response, secure: boolean) {
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(securityHeaders(secure))) result.headers.set(name, value);
  return result;
}
