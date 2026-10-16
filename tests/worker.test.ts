// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import chefbotWorker from "@/worker/src/index";
import {
  AI_TIMEOUT_MS,
  OPENAI_URL,
  resetRateLimiter,
  type WorkerEnv,
} from "@/worker/src/runtime";

const ORIGIN = "https://chefbot.test";

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    OPENAI_API_KEY: "test-key",
    CORS_ALLOWED_ORIGINS: `${ORIGIN},http://localhost:3000`,
    RATE_LIMIT_PER_HOUR: "20",
    ...overrides,
  };
}

const VALID_AI_PAYLOAD = {
  recipes: [
    {
      title: "Garlic Egg Fried Rice",
      emoji: "🍳",
      minutes: 15,
      uses: ["egg", "rice", "garlic"],
      missing: ["spring onion"],
      steps: ["Cook the rice.", "Fry the garlic and egg.", "Toss and serve."],
    },
    {
      title: "Tomato Omelette",
      emoji: "🍳",
      minutes: 10,
      uses: ["egg", "tomato"],
      missing: ["butter"],
      steps: ["Beat the eggs.", "Cook with the tomato."],
    },
    {
      title: "Peanut Butter Noodles",
      emoji: "🍜",
      minutes: 12,
      uses: ["noodle", "peanut butter"],
      missing: ["chili"],
      steps: ["Boil the noodles.", "Mix the sauce.", "Toss and serve."],
    },
  ],
};

const VALID_REQUEST = {
  ingredients: ["egg", "rice", "garlic"],
  maxMinutes: 20,
  vegetarian: false,
};

function postRequest(
  body: unknown,
  opts: { headers?: Record<string, string>; raw?: string } = {},
): Request {
  return new Request("https://worker.test/recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.10",
      Origin: ORIGIN,
      ...opts.headers,
    },
    body: opts.raw ?? JSON.stringify(body),
  });
}

function openAiResponse(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  resetRateLimiter();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("routing and CORS", () => {
  it("answers health checks", async () => {
    const response = await chefbotWorker.fetch(
      new Request("https://worker.test/health"),
      makeEnv(),
    );
    expect(response.status).toBe(200);
  });

  it("allows a preflight from an allowlisted origin", async () => {
    const response = await chefbotWorker.fetch(
      new Request("https://worker.test/recipes", {
        method: "OPTIONS",
        headers: { Origin: ORIGIN },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("rejects a preflight from an unknown origin", async () => {
    const response = await chefbotWorker.fetch(
      new Request("https://worker.test/recipes", {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      }),
      makeEnv(),
    );
    expect(response.status).toBe(403);
  });

  it("rejects requests from an unknown origin", async () => {
    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST, { headers: { Origin: "https://evil.example" } }),
      makeEnv(),
    );
    expect(response.status).toBe(403);
  });

  it("returns 405 for non-POST /recipes and 404 elsewhere", async () => {
    const get = await chefbotWorker.fetch(
      new Request("https://worker.test/recipes", {
        method: "GET",
        headers: { Origin: ORIGIN },
      }),
      makeEnv(),
    );
    expect(get.status).toBe(405);

    const missing = await chefbotWorker.fetch(
      new Request("https://worker.test/nope", {
        headers: { Origin: ORIGIN },
      }),
      makeEnv(),
    );
    expect(missing.status).toBe(404);
  });
});

describe("input handling", () => {
  it("rejects malformed JSON with 400 invalid_json", async () => {
    const response = await chefbotWorker.fetch(
      postRequest(null, { raw: "{not json" }),
      makeEnv(),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_json");
  });

  it("rejects invalid requests with 400 invalid_request", async () => {
    const response = await chefbotWorker.fetch(
      postRequest({ ingredients: ["egg"], maxMinutes: 20, vegetarian: false }),
      makeEnv(),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalid_request");
  });

  it("rejects oversized bodies with 413", async () => {
    const response = await chefbotWorker.fetch(
      postRequest(null, { raw: "x".repeat(5000) }),
      makeEnv(),
    );
    expect(response.status).toBe(413);
  });

  it("returns 503 when the API key is not configured", async () => {
    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST),
      makeEnv({ OPENAI_API_KEY: undefined }),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("ai_not_configured");
  });
});

describe("AI proxy", () => {
  it("proxies a validated OpenAI response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      openAiResponse(JSON.stringify(VALID_AI_PAYLOAD)),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.recipes).toHaveLength(3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(OPENAI_URL);
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const payload = JSON.parse(init.body);
    expect(payload.model).toBe("gpt-4o-mini");
    expect(payload.response_format).toEqual({ type: "json_object" });
  });

  it("never leaks the API key to the client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(openAiResponse("not json at all")),
    );
    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST),
      makeEnv(),
    );
    const text = JSON.stringify(await response.json());
    expect(text).not.toContain("test-key");
    expect(text).not.toContain("api.openai.com");
  });

  it("maps upstream HTTP failures to 502 ai_error without details", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("provider exploded: internal detail", { status: 500 }),
        ),
    );
    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST),
      makeEnv(),
    );
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe("ai_error");
    expect(JSON.stringify(body)).not.toContain("provider exploded");
  });

  it("maps non-JSON completions to 502 ai_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(openAiResponse("Sure! Here are recipes...")),
    );
    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST),
      makeEnv(),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("ai_error");
  });

  it("maps schema-invalid completions to 502 ai_invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        openAiResponse(JSON.stringify({ recipes: VALID_AI_PAYLOAD.recipes.slice(0, 2) })),
      ),
    );
    const response = await chefbotWorker.fetch(
      postRequest(VALID_REQUEST),
      makeEnv(),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("ai_invalid");
  });

  it("maps provider timeouts to 504 ai_timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }),
      ),
    );

    const pending = chefbotWorker.fetch(postRequest(VALID_REQUEST), makeEnv());
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS + 10);
    const response = await pending;

    expect(response.status).toBe(504);
    expect((await response.json()).error.code).toBe("ai_timeout");
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the hourly budget is spent", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(openAiResponse(JSON.stringify(VALID_AI_PAYLOAD))),
      );
    vi.stubGlobal("fetch", fetchMock);

    const env = makeEnv({ RATE_LIMIT_PER_HOUR: "3" });
    const makeCall = () =>
      chefbotWorker.fetch(
        postRequest(VALID_REQUEST, {
          headers: { "CF-Connecting-IP": "198.51.100.7" },
        }),
        env,
      );

    const statuses = [
      (await makeCall()).status,
      (await makeCall()).status,
      (await makeCall()).status,
    ];
    expect(statuses).toEqual([200, 200, 200]);

    const limited = await makeCall();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect((await limited.json()).error.code).toBe("rate_limited");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
