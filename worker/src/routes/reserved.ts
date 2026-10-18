import type { WorkerEnv } from "../env";
import { errorResponse, type HeaderMap } from "../lib/http";

/**
 * GitAura / PocketLM routes of the shared Worker, reserved so the route
 * table matches the shared design. They answer 501 until their specs (the
 * GitAura PRD: OAuth session, attest signature format, /aura, /study, /ask)
 * are provided.
 */
export function notImplemented(
  _request: Request,
  _env: WorkerEnv,
  headers: HeaderMap,
): Response {
  return errorResponse(
    501,
    "not_implemented",
    "This endpoint is reserved and not available yet.",
    headers,
  );
}
