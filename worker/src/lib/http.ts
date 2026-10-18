export type HeaderMap = Record<string, string>;

export function json(status: number, body: unknown, headers: HeaderMap = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** Uniform error envelope: { error: { code, message } } — never upstream detail. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: HeaderMap = {},
  reason?: string,
): Response {
  return json(status, { error: reason ? { code, message, reason } : { code, message } }, headers);
}
