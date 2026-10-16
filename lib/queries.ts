import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  contractAddress,
  fetchDishes,
  fetchIsCooked,
  fetchMyDishKeys,
  fetchDish,
  type DishEntry,
} from "./contract";
import { recipeKey } from "./recipe-key";

/** Shared query-key namespace — prefix invalidation refreshes every read. */
export const chefbotKeys = {
  all: ["chefbot"] as const,
  dishes: () => ["chefbot", "dishes"] as const,
  myKitchen: (address?: string) => ["chefbot", "my-kitchen", address] as const,
  cooked: (address?: string, key?: string) =>
    ["chefbot", "cooked", address, key] as const,
};

/** All stamped dishes (leaderboard), ordered by the contract's insertion order. */
export function useDishes() {
  const configured = contractAddress() !== null;
  return useQuery({
    queryKey: chefbotKeys.dishes(),
    queryFn: fetchDishes,
    enabled: configured,
    retry: false,
  });
}

export type MyKitchenEntry = DishEntry;

/** Dishes stamped by one cook (My Kitchen). Refetches when the wallet changes. */
export function useMyKitchen(address?: `0x${string}`) {
  return useQuery({
    queryKey: chefbotKeys.myKitchen(address),
    queryFn: async (): Promise<MyKitchenEntry[]> => {
      if (!address) {
        return [];
      }
      const keys = await fetchMyDishKeys(address);
      const dishes = await Promise.all(keys.map((key) => fetchDish(key)));
      return keys.map((key, index) => ({
        key,
        title: dishes[index]?.title ?? "",
        emoji: dishes[index]?.emoji ?? "",
        cooks: dishes[index]?.cooks ?? 0,
      }));
    },
    enabled: Boolean(address) && contractAddress() !== null,
    retry: false,
  });
}

/** Whether the connected wallet already stamped this recipe title. */
export function useIsCooked(address?: `0x${string}`, title?: string) {
  const key = title ? recipeKey(title) : undefined;
  return useQuery({
    queryKey: chefbotKeys.cooked(address, key),
    queryFn: async (): Promise<boolean> => {
      if (!address || !key) {
        return false;
      }
      return fetchIsCooked(address, key);
    },
    enabled: Boolean(address && key) && contractAddress() !== null,
    retry: false,
  });
}

/** Invalidates every ChefBOT read — call after a confirmed receipt. */
export function useRefreshOnChain() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chefbotKeys.all });
  }, [queryClient]);
}
