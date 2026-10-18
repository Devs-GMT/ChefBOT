/**
 * Shared Cloudflare Worker (GitAura shape) — currently serving ChefBOT.
 *
 *   GET  /health                → liveness
 *   POST /recipes               → ChefBOT AI recipes (Gemini)          [live]
 *   GET  /auth/github/login     → GitAura                              [reserved, 501]
 *   GET  /auth/github/callback  → GitAura                              [reserved, 501]
 *   POST /auth/attest           → GitAura                              [reserved, 501]
 *   POST /aura | /study | /ask  → GitAura / PocketLM AI                [reserved, 501]
 *
 * Every request: CORS allowlist → route lookup → per-IP hourly rate limit
 * (Durable Object) → handler. Provider keys never leave the Worker.
 *
 * The entry module exports the default handler and the RateLimiter Durable
 * Object class (wrangler binds it by class name) — nothing else.
 */

import type { WorkerEnv } from "./env";
import { allowedOrigins, corsHeaders } from "./lib/cors";
import { errorResponse, json } from "./lib/http";
import { checkRateLimit, RateLimiter } from "./lib/rate-limit";
import { ROUTES } from "./routes";

export { RateLimiter };

const DEFAULT_LIMIT = 20;

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, env);

    if (origin && !allowedOrigins(env).has(origin)) {
      return errorResponse(403, "origin_not_allowed", "Origin not allowed.", headers);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (path === "/health") {
      return json(200, { ok: true }, headers);
    }

    const matches = ROUTES.filter((route) => route.path === path);
    if (matches.length === 0) {
      return errorResponse(404, "not_found", "Unknown endpoint.", headers);
    }
    const route = matches.find((candidate) => candidate.method === request.method);
    if (!route) {
      const allow = matches.map((candidate) => candidate.method).join(", ");
      return errorResponse(405, "method_not_allowed", `Use ${allow} ${path}.`, {
        ...headers,
        Allow: allow,
      });
    }

    if (route.limited) {
      const configured = Number(env.RATE_LIMIT_PER_HOUR ?? DEFAULT_LIMIT);
      const limit = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_LIMIT;
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const rate = await checkRateLimit(env.RATE_LIMITER, ip, limit);
      if (!rate.allowed) {
        return errorResponse(429, "rate_limited", "Too many requests. Try again later.", {
          ...headers,
          "Retry-After": String(rate.retryAfterSeconds),
        });
      }
    }

    return route.handler(request, env, headers);
  },
};
