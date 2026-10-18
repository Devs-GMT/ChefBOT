import type { WorkerEnv } from "./env";
import type { HeaderMap } from "./lib/http";
import { handleRecipes } from "./routes/recipes";
import { notImplemented } from "./routes/reserved";

export type Handler = (
  request: Request,
  env: WorkerEnv,
  headers: HeaderMap,
) => Response | Promise<Response>;

export interface Route {
  method: "GET" | "POST";
  path: string;
  handler: Handler;
  /** Counts against the per-IP hourly budget (AI + auth endpoints). */
  limited: boolean;
}

/** Shared Worker route table (GitAura + ChefBOT + PocketLM). */
export const ROUTES: Route[] = [
  // ChefBOT
  { method: "POST", path: "/recipes", handler: handleRecipes, limited: true },
  // GitAura — reserved until specified
  { method: "GET", path: "/auth/github/login", handler: notImplemented, limited: true },
  { method: "GET", path: "/auth/github/callback", handler: notImplemented, limited: true },
  { method: "POST", path: "/auth/attest", handler: notImplemented, limited: true },
  { method: "POST", path: "/aura", handler: notImplemented, limited: true },
  // PocketLM — reserved until specified
  { method: "POST", path: "/study", handler: notImplemented, limited: true },
  { method: "POST", path: "/ask", handler: notImplemented, limited: true },
];
