/**
 * Recipe archive (v1.1). Only title + emoji live on-chain, so the steps of
 * an AI-made dish were lost to everyone but its cook. After a successful
 * stamp the app posts the recipe here. It is stored once (first writer
 * wins), and only if the transaction really emitted the ChefBOT `Cooked`
 * event for that title. The leaderboard reads it back by title.
 */

import { MAX_TITLE_BYTES, byteLength, normalizeTitle, validateRecipe } from "../../../shared/recipe-schema";
import type { WorkerEnv } from "../env";
import { verifyStamp } from "../lib/chain";
import { errorResponse, json, type HeaderMap } from "../lib/http";

export const MAX_DISH_BODY_BYTES = 8192;
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
/** House recipes can run longer than the AI's 30 min cap. */
const MAX_DISH_MINUTES = 180;

const dishKey = (title: string) => `dish:${normalizeTitle(title)}`;

export async function handlePostDish(
  request: Request,
  env: WorkerEnv,
  headers: HeaderMap,
): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_DISH_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "Request body too large.", headers);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be JSON.", headers);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse(400, "invalid_request", "body: not an object", headers);
  }
  const { txHash, recipe: rawRecipe } = body as { txHash?: unknown; recipe?: unknown };
  if (typeof txHash !== "string" || !TX_HASH.test(txHash)) {
    return errorResponse(400, "invalid_request", "txHash: not a transaction hash", headers);
  }
  const recipe = validateRecipe(rawRecipe, { maxMinutes: MAX_DISH_MINUTES });
  if (!recipe.ok) {
    return errorResponse(400, "invalid_request", recipe.reason, headers);
  }

  if (!env.DISHES || !env.CHAIN_RPC_URL || !env.CHEFBOT_CONTRACT_ADDRESS) {
    return errorResponse(503, "archive_not_configured", "Recipe archive is not configured.", headers);
  }

  const key = dishKey(recipe.value.title);
  if ((await env.DISHES.get(key)) !== null) {
    return json(200, { stored: false }, headers);
  }

  const proof = await verifyStamp({
    rpcUrl: env.CHAIN_RPC_URL,
    contract: env.CHEFBOT_CONTRACT_ADDRESS,
    txHash,
    title: recipe.value.title,
  });
  if (!proof.ok) {
    return proof.reason === "rpc"
      ? errorResponse(502, "chain_unavailable", "Could not read BOT Chain.", headers)
      : errorResponse(422, "stamp_not_proven", "That transaction did not stamp this dish.", headers);
  }

  await env.DISHES.put(key, JSON.stringify({ recipe: recipe.value, txHash }));
  return json(201, { stored: true }, headers);
}

export async function handleGetDish(
  request: Request,
  env: WorkerEnv,
  headers: HeaderMap,
): Promise<Response> {
  const title = (new URL(request.url).searchParams.get("title") ?? "").trim();
  if (!title || byteLength(title) > MAX_TITLE_BYTES) {
    return errorResponse(400, "invalid_request", "title: missing or too long", headers);
  }
  if (!env.DISHES) {
    return errorResponse(503, "archive_not_configured", "Recipe archive is not configured.", headers);
  }
  const stored = await env.DISHES.get(dishKey(title));
  let recipe: unknown = null;
  try {
    recipe = stored === null ? null : (JSON.parse(stored) as { recipe?: unknown }).recipe ?? null;
  } catch {
    recipe = null;
  }
  if (recipe === null) {
    return errorResponse(404, "not_found", "No archived recipe for that dish.", headers);
  }
  return json(200, { recipe }, { ...headers, "Cache-Control": "public, max-age=300" });
}
