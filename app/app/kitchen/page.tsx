import type { Metadata } from "next";

import { MyKitchen } from "@/components/kitchen/my-kitchen";

export const metadata: Metadata = {
  title: "My Kitchen — ChefBOT Kitchen",
  description: "Every dish your wallet has stamped on BOT Chain, as a passport of stamps.",
};

export default function KitchenPage() {
  return (
    <main className="flex-1">
      <MyKitchen titleAs="h1" />
    </main>
  );
}
