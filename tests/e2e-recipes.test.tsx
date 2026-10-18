import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookFlow } from "@/components/kitchen/cook-flow";
import chefbotWorker from "@/worker/src/index";
import type { WorkerEnv } from "@/worker/src/env";
import { GEMINI_BASE_URL, DEFAULT_GEMINI_MODEL, geminiUrl } from "@/worker/src/lib/gemini";
import { resetRateLimiter } from "@/worker/src/lib/rate-limit";
import { renderWithProviders } from "./render-with-providers";

/**
 * End-to-end pipeline test with a mocked AI provider:
 *
 *   CookFlow UI → getRecipes (real lib) → global fetch stub
 *     → real Cloudflare Worker handler (worker/src/index.ts)
 *       → canned Gemini generateContent response
 *         → schema validation → recipes rendered in the UI.
 *
 * No module under test is mocked — only the network boundary is stubbed.
 */

const WORKER_BASE = "https://worker.test";

const AI_PAYLOAD = {
  recipes: [
    {
      title: "Garlic Egg Fried Rice",
      emoji: "🍳",
      minutes: 15,
      uses: ["egg", "rice"],
      missing: ["garlic"],
      steps: ["Cook the rice.", "Fry the garlic and egg.", "Toss and serve."],
    },
    {
      title: "Tomato Omelette",
      emoji: "🍳",
      minutes: 10,
      uses: ["egg"],
      missing: ["butter"],
      steps: ["Beat the eggs.", "Cook with the tomato."],
    },
    {
      title: "Rice Bowl",
      emoji: "🍚",
      minutes: 12,
      uses: ["rice"],
      missing: ["soy sauce"],
      steps: ["Steam the rice.", "Top and serve."],
    },
  ],
};

const WORKER_ENV: WorkerEnv = {
  GEMINI_API_KEY: "test-key",
  CORS_ALLOWED_ORIGINS: "http://localhost:3000",
  RATE_LIMIT_PER_HOUR: "100",
};

let providerStatus = 200;

function stubNetworkToRealWorker(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;

        if (url.startsWith(GEMINI_BASE_URL)) {
          if (providerStatus !== 200) {
            return new Response("upstream boom", { status: providerStatus });
          }
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: { role: "model", parts: [{ text: JSON.stringify(AI_PAYLOAD) }] },
                  finishReason: "STOP",
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return chefbotWorker.fetch(new Request(url, init), WORKER_ENV);
      },
    ),
  );
}

async function pickEggRiceAndFindRecipes(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Egg" }));
  await user.click(screen.getByRole("tab", { name: /Grains/ }));
  await user.click(screen.getByRole("button", { name: "Rice" }));
  await user.click(screen.getByRole("button", { name: "Cook something →" }));
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_RECIPES_API_URL = WORKER_BASE;
  providerStatus = 200;
  resetRateLimiter();
  stubNetworkToRealWorker();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_RECIPES_API_URL;
  resetRateLimiter();
});

describe("recipes end-to-end (UI → client → Worker → mocked Gemini)", () => {
  it("renders three AI recipes produced by the real Worker handler", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);

    await pickEggRiceAndFindRecipes(user);

    expect(
      await screen.findByRole("heading", { name: /Tonight's picks/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Garlic Egg Fried Rice/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tomato Omelette/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Rice Bowl/ })).toBeInTheDocument();
    expect(screen.queryByText(/House favourites/)).not.toBeInTheDocument();

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [workerUrl, workerInit] = fetchMock.mock.calls[0];
    expect(workerUrl).toBe(`${WORKER_BASE}/recipes`);
    expect(workerInit?.method).toBe("POST");
    expect(JSON.parse(String(workerInit?.body))).toEqual({
      ingredients: ["egg", "rice"],
      maxMinutes: 20,
      vegetarian: false,
    });
    const [providerUrl] = fetchMock.mock.calls[1];
    expect(String(providerUrl)).toBe(geminiUrl(DEFAULT_GEMINI_MODEL));
  });

  it("falls back to House favourites when the provider fails upstream", async () => {
    providerStatus = 500;
    const user = userEvent.setup();
    renderWithProviders(<CookFlow />);

    await pickEggRiceAndFindRecipes(user);

    expect(await screen.findByText(/House favourites/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Tonight's picks/ }),
    ).toBeInTheDocument();

    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [workerUrl] = fetchMock.mock.calls[0];
    expect(workerUrl).toBe(`${WORKER_BASE}/recipes`);
    const [providerUrl, providerInit] = fetchMock.mock.calls[1];
    expect(String(providerUrl)).toBe(geminiUrl(DEFAULT_GEMINI_MODEL));
    const key = (providerInit?.headers as Record<string, string> | undefined)?.["x-goog-api-key"];
    expect(key).toBe("test-key");
  });
});
