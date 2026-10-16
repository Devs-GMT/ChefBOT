/**
 * Worker runtime helpers kept OUT of the entry module.
 *
 * The Workers runtime only accepts handler exports (functions or
 * ExportedHandler objects) from the module named in `wrangler.jsonc`,
 * so constants, types, and state live here and are imported by index.ts.
 */

export interface WorkerEnv {
  /** OpenAI key — set via `wrangler secret put OPENAI_API_KEY`. */
  OPENAI_API_KEY?: string;
  /** Comma-separated exact origins allowed by CORS. */
  CORS_ALLOWED_ORIGINS?: string;
  /** Requests allowed per IP per hour (default 20). */
  RATE_LIMIT_PER_HOUR?: string;
}

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
export const OPENAI_MODEL = "gpt-4o-mini";
/** Worker-side budget; the frontend budget is 8s (lib/recipes.ts). */
export const AI_TIMEOUT_MS = 7000;
export const MAX_BODY_BYTES = 4096;
export const RATE_WINDOW_MS = 60 * 60 * 1000;
export const MAX_RATE_BUCKETS = 10_000;

interface RateBucket {
  count: number;
  resetAt: number;
}

/** Best-effort fixed-window limiter, keyed by client IP (per isolate). */
const rateBuckets = new Map<string, RateBucket>();

export function resetRateLimiter(): void {
  rateBuckets.clear();
}

export function checkRateLimit(
  ip: string,
  limit: number,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  if (rateBuckets.size > MAX_RATE_BUCKETS) {
    rateBuckets.clear();
  }
  let bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function allowedOrigins(env: WorkerEnv): Set<string> {
  return new Set(
    (env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function corsHeaders(
  origin: string | null,
  env: WorkerEnv,
): Record<string, string> {
  const allowed = allowedOrigins(env);
  if (origin && allowed.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Expose-Headers": "Retry-After",
      "Vary": "Origin",
    };
  }
  return {};
}
