import { encodeAbiParameters, encodeEventTopics, type Log } from "viem";
import { describe, expect, it } from "vitest";

import { chefbotAbi } from "@/lib/abi/ChefBOT";
import { cookNumberFromLogs, shareOnXUrl } from "@/lib/cooked-event";
import { recipeKey } from "@/lib/recipe-key";

const CONTRACT = "0x5191b250E9F18d640B2138a1Da0409be0f1dD092" as const;
const COOK = "0x2222222222222222222222222222222222222222" as const;

function cookedLog(
  cooks: number,
  address: `0x${string}` = CONTRACT,
  title = "Fried Rice",
): Log {
  const topics = encodeEventTopics({
    abi: chefbotAbi,
    eventName: "Cooked",
    args: { key: recipeKey(title), cook: COOK },
  });
  const data = encodeAbiParameters(
    [{ type: "string" }, { type: "uint32" }],
    [title, cooks],
  );
  return {
    address,
    topics: topics as [`0x${string}`, ...`0x${string}`[]],
    data,
    blockHash: null,
    blockNumber: null,
    logIndex: null,
    transactionHash: null,
    transactionIndex: null,
    removed: false,
  };
}

describe("cookNumberFromLogs", () => {
  it("reads the cook count from the contract's Cooked event", () => {
    expect(cookNumberFromLogs([cookedLog(14)], CONTRACT)).toBe(14);
  });

  it("matches the contract address case-insensitively", () => {
    expect(
      cookNumberFromLogs(
        [cookedLog(3)],
        CONTRACT.toLowerCase() as `0x${string}`,
      ),
    ).toBe(3);
  });

  it("ignores Cooked-shaped logs emitted by another contract", () => {
    const other = "0x9999999999999999999999999999999999999999" as const;
    expect(cookNumberFromLogs([cookedLog(99, other)], CONTRACT)).toBeNull();
  });

  it("returns null when there is no decodable Cooked event", () => {
    expect(cookNumberFromLogs([], CONTRACT)).toBeNull();
    expect(
      cookNumberFromLogs(
        [{ ...cookedLog(1), topics: ["0x01"], data: "0x" } as Log],
        CONTRACT,
      ),
    ).toBeNull();
  });
});

describe("shareOnXUrl", () => {
  it("builds an X intent with the dish, cook number and chain", () => {
    const url = new URL(
      shareOnXUrl({ title: "Fried Rice", emoji: "🍳", cookNumber: 14 }),
    );
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain("🍳 Fried Rice");
    expect(text).toContain("cook #14");
    expect(text).toContain("BOT Chain");
  });

  it("omits the cook number when it is unknown", () => {
    const url = new URL(
      shareOnXUrl({ title: "Ramen", emoji: "🍜", cookNumber: null }),
    );
    expect(url.searchParams.get("text")).not.toContain("#");
  });

  it("adds the app link when one is given", () => {
    const url = new URL(
      shareOnXUrl({
        title: "Ramen",
        emoji: "🍜",
        cookNumber: 2,
        appUrl: "https://chefbot.example/app",
      }),
    );
    expect(url.searchParams.get("url")).toBe("https://chefbot.example/app");
  });
});
