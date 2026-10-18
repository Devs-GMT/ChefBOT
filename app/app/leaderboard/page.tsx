import type { Metadata } from "next";

import { Leaderboard } from "@/components/kitchen/leaderboard";

export const metadata: Metadata = {
  title: "Most Cooked — ChefBOT Kitchen",
  description: "The dishes stamped most on BOT Chain, read straight from the contract.",
};

export default function LeaderboardPage() {
  return (
    <main className="flex-1">
      <Leaderboard titleAs="h1" />
    </main>
  );
}
