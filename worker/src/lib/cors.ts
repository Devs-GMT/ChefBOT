import type { WorkerEnv } from "../env";

export function allowedOrigins(env: WorkerEnv): Set<string> {
  return new Set(
    (env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function corsHeaders(origin: string | null, env: WorkerEnv): Record<string, string> {
  if (origin && allowedOrigins(env).has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Access-Control-Expose-Headers": "Retry-After",
      Vary: "Origin",
    };
  }
  return {};
}
