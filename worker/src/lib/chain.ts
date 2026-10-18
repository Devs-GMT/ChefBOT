/**
 * Minimal BOT Chain reads for the recipe archive: fetch a transaction
 * receipt over JSON-RPC and check it carries a ChefBOT `Cooked` event for
 * the dish being archived. Hand-rolled ABI decoding (one string + one
 * uint32) keeps the Worker dependency-free; tests pin it against viem.
 */

import { normalizeTitle } from "../../../shared/recipe-schema";

/** keccak256("Cooked(bytes32,address,string,uint32)") — guarded by a test. */
export const COOKED_TOPIC0 = "0x5f964407c6782f201ea04706c05d25f4f3728527dc522e2e2903e5028e1a2458";
const RPC_TIMEOUT_MS = 5000;
const MAX_TITLE_DECODE_BYTES = 1024;
const HEX = /^0x[0-9a-fA-F]*$/;
const WORD = BigInt(32);
const ZERO = BigInt(0);
const MAX_UINT32 = BigInt(0xffffffff);

const decoder = new TextDecoder("utf-8", { fatal: true });

function word(hex: string, index: number): bigint | null {
  const slice = hex.slice(index * 64, index * 64 + 64);
  return slice.length === 64 ? BigInt(`0x${slice}`) : null;
}

/** Decode `Cooked` log data: abi.encode(string title, uint32 cooks). */
export function decodeCookedData(data: string): { title: string; cooks: number } | null {
  if (!HEX.test(data) || (data.length - 2) % 64 !== 0) return null;
  const hex = data.slice(2);
  const offset = word(hex, 0);
  const cooks = word(hex, 1);
  if (offset === null || cooks === null || offset % WORD !== ZERO || cooks > MAX_UINT32) return null;
  const lengthWord = Number(offset / WORD);
  const length = word(hex, lengthWord);
  if (length === null || length > BigInt(MAX_TITLE_DECODE_BYTES)) return null;
  const size = Number(length);
  const start = (lengthWord + 1) * 64;
  const bytesHex = hex.slice(start, start + size * 2);
  if (bytesHex.length !== size * 2) return null;
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = parseInt(bytesHex.slice(i * 2, i * 2 + 2), 16);
  }
  try {
    return { title: decoder.decode(bytes), cooks: Number(cooks) };
  } catch {
    return null;
  }
}

interface ReceiptLog {
  address?: unknown;
  topics?: unknown;
  data?: unknown;
}

interface Receipt {
  status?: unknown;
  logs?: unknown;
}

export type StampCheck = { ok: true } | { ok: false; reason: "rpc" | "not_proven" };

/**
 * True when `txHash` succeeded and emitted a `Cooked` event from `contract`
 * whose title normalises to `title` (the same rule as the on-chain key).
 */
export async function verifyStamp(
  { rpcUrl, contract, txHash, title }: { rpcUrl: string; contract: string; txHash: string; title: string },
  fetchImpl: typeof fetch = fetch,
): Promise<StampCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  let receipt: Receipt | null;
  try {
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: "rpc" };
    const body = (await response.json()) as { result?: Receipt | null; error?: unknown };
    if (body.error) return { ok: false, reason: "rpc" };
    receipt = body.result ?? null;
  } catch {
    return { ok: false, reason: "rpc" };
  } finally {
    clearTimeout(timer);
  }

  if (!receipt || receipt.status !== "0x1" || !Array.isArray(receipt.logs)) {
    return { ok: false, reason: "not_proven" };
  }
  const target = contract.toLowerCase();
  const wanted = normalizeTitle(title);
  const proven = (receipt.logs as ReceiptLog[]).some((log) => {
    if (typeof log.address !== "string" || log.address.toLowerCase() !== target) return false;
    if (!Array.isArray(log.topics) || String(log.topics[0]).toLowerCase() !== COOKED_TOPIC0) return false;
    const decoded = typeof log.data === "string" ? decodeCookedData(log.data) : null;
    return decoded !== null && normalizeTitle(decoded.title) === wanted;
  });
  return proven ? { ok: true } : { ok: false, reason: "not_proven" };
}
