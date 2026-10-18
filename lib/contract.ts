import { chefbotAbi } from "./abi/ChefBOT";
import { publicClientFor } from "./chain";

import { contractAddress } from "./chain-config";

export { contractAddress, explorerAddressUrl } from "./chain-config";

export class ContractNotConfiguredError extends Error {
  constructor() {
    super("ChefBOT contract address is not configured.");
    this.name = "ContractNotConfiguredError";
  }
}

interface DishStruct {
  title: string;
  emoji: string;
  cooks: number;
}

export interface DishEntry extends DishStruct {
  key: `0x${string}`;
}

function requireAddress(): `0x${string}` {
  const address = contractAddress();
  if (!address) {
    throw new ContractNotConfiguredError();
  }
  return address;
}

/**
 * All stamped dishes (leaderboard source), unordered. One `getDishes()`
 * call returns keys and dishes together, so they are always index-aligned
 * (two separate reads could straddle a new stamp).
 */
export async function fetchDishes(): Promise<DishEntry[]> {
  const address = requireAddress();
  const [keys, dishes] = (await publicClientFor().readContract({
    address,
    abi: chefbotAbi,
    functionName: "getDishes",
  })) as readonly [readonly `0x${string}`[], readonly DishStruct[]];
  const typedKeys = [...keys];
  const typedDishes = [...dishes];
  return typedKeys.map((key, index) => ({
    key,
    title: typedDishes[index]?.title ?? "",
    emoji: typedDishes[index]?.emoji ?? "",
    cooks: typedDishes[index]?.cooks ?? 0,
  }));
}

/** Dish keys stamped by one cook (My Kitchen source). */
export async function fetchMyDishKeys(
  cook: `0x${string}`,
): Promise<`0x${string}`[]> {
  const address = requireAddress();
  const keys = await publicClientFor().readContract({
    address,
    abi: chefbotAbi,
    functionName: "getMyDishes",
    args: [cook],
  });
  return keys as `0x${string}`[];
}

/** Single-dish lookup by recipe key. */
export async function fetchDish(
  key: `0x${string}`,
): Promise<DishStruct> {
  const address = requireAddress();
  const dish = await publicClientFor().readContract({
    address,
    abi: chefbotAbi,
    functionName: "getDish",
    args: [key],
  });
  return dish as unknown as DishStruct;
}

/** Whether a cook has already stamped a recipe key. */
export async function fetchIsCooked(
  cook: `0x${string}`,
  key: `0x${string}`,
): Promise<boolean> {
  const address = requireAddress();
  const cooked = await publicClientFor().readContract({
    address,
    abi: chefbotAbi,
    functionName: "cooked",
    // The Solidity getter is `cooked(bytes32 key, address cook)` — key first.
    args: [key, cook],
  });
  return Boolean(cooked);
}

/** Cook count for one key (0 when the dish is not registered). */
export async function fetchCookCount(
  key: `0x${string}`,
): Promise<number> {
  const dish = await fetchDish(key);
  return dish.cooks;
}
