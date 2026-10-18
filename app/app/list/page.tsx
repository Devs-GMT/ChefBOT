import type { Metadata } from "next";

import { ShoppingList } from "@/components/kitchen/shopping-list";

export const metadata: Metadata = {
  title: "Shopping List — ChefBOT Kitchen",
  description: "What your recipes are missing, printed as a receipt. Saved only in this browser.",
};

export default function ListPage() {
  return (
    <main className="flex-1">
      <ShoppingList titleAs="h1" />
    </main>
  );
}
