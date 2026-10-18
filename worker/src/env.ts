import type { DurableObjectNamespaceLike } from "./lib/rate-limit";

/**
 * Bindings and secrets for the shared Worker (GitAura shape: one Worker,
 * several apps). Only the ChefBOT `/recipes` route is live today; the
 * GitAura auth/attest secrets are typed here so the shape is fixed, and are
 * unused until those routes are specified.
 */
export interface WorkerEnv {
  /** Google Gemini key — `wrangler secret put GEMINI_API_KEY`. */
  GEMINI_API_KEY?: string;
  /** Gemini model id (default: DEFAULT_GEMINI_MODEL in lib/gemini.ts). */
  GEMINI_MODEL?: string;
  /** Optional thinkingConfig.thinkingLevel (e.g. "minimal"); unset = model default. */
  GEMINI_THINKING_LEVEL?: string;
  /** Model for POST /scan (vision); unset = GEMINI_MODEL. */
  GEMINI_SCAN_MODEL?: string;
  /** Optional thinkingLevel for POST /scan only; unset = model default. */
  GEMINI_SCAN_THINKING_LEVEL?: string;
  /** Comma-separated exact origins allowed by CORS. */
  CORS_ALLOWED_ORIGINS?: string;
  /** AI requests allowed per IP per hour (default 20). */
  RATE_LIMIT_PER_HOUR?: string;
  /** Durable Object namespace backing the per-IP hourly limiter. */
  RATE_LIMITER?: DurableObjectNamespaceLike;

  // Reserved for the GitAura routes (not used yet).
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ATTESTER_PRIVATE_KEY?: string;
}
