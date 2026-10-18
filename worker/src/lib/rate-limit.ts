/**
 * Per-IP hourly rate limit (PRD: 20 requests / IP / hour).
 *
 * Cloudflare's built-in Rate Limiting binding only offers 10 s / 60 s
 * windows, so the hourly budget lives in a SQLite-backed Durable Object —
 * one instance per IP, a fixed one-hour window. A DO instance runs one
 * request at a time, so read-modify-write on its storage is race-free.
 *
 * Without the binding (unit tests, plain local runs) an in-memory limiter
 * per isolate takes over; if the DO call itself fails we fall back to it
 * as well rather than blocking every visitor.
 */

export const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_MEMORY_BUCKETS = 10_000;

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Minimal shapes of the Workers DO APIs we use (no workers-types dependency). */
export interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
}
export interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}
export interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}
export interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
}

function decide(bucket: Bucket | undefined, limit: number, now: number): { bucket: Bucket; decision: RateDecision } {
  const current = !bucket || now >= bucket.resetAt ? { count: 0, resetAt: now + RATE_WINDOW_MS } : bucket;
  const next = { count: current.count + 1, resetAt: current.resetAt };
  return {
    bucket: next,
    decision: {
      allowed: next.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((next.resetAt - now) / 1000)),
    },
  };
}

/** Durable Object class (bound as RATE_LIMITER in wrangler.jsonc). */
export class RateLimiter {
  constructor(private readonly state: DurableObjectStateLike) {}

  async fetch(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => ({}))) as { limit?: unknown; now?: unknown };
    const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
    const now = typeof body.now === "number" ? body.now : Date.now();
    const { bucket, decision } = decide(await this.state.storage.get<Bucket>("bucket"), limit, now);
    await this.state.storage.put("bucket", bucket);
    return new Response(JSON.stringify(decision), { headers: { "Content-Type": "application/json" } });
  }
}

const memoryBuckets = new Map<string, Bucket>();

export function resetRateLimiter(): void {
  memoryBuckets.clear();
}

function checkMemory(ip: string, limit: number, now: number): RateDecision {
  if (memoryBuckets.size > MAX_MEMORY_BUCKETS) {
    memoryBuckets.clear();
  }
  const { bucket, decision } = decide(memoryBuckets.get(ip), limit, now);
  memoryBuckets.set(ip, bucket);
  return decision;
}

export async function checkRateLimit(
  namespace: DurableObjectNamespaceLike | undefined,
  ip: string,
  limit: number,
  now: number = Date.now(),
): Promise<RateDecision> {
  if (namespace) {
    try {
      const stub = namespace.get(namespace.idFromName(ip));
      const response = await stub.fetch("https://rate-limiter/check", {
        method: "POST",
        body: JSON.stringify({ limit, now }),
      });
      const decision = (await response.json()) as RateDecision;
      if (typeof decision.allowed === "boolean") {
        return decision;
      }
    } catch {
      // Fall through to the per-isolate limiter.
    }
  }
  return checkMemory(ip, limit, now);
}
