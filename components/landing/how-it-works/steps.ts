import type { ComponentType } from "react";

import { PantryIllustration } from "@/components/illustrations/pantry-illustration";
import { RecipesIllustration } from "@/components/illustrations/recipes-illustration";
import { StampIllustration } from "@/components/illustrations/stamp-illustration";

export type StepKind = "pantry" | "recipes" | "stamp";

export interface Step {
  kind: StepKind;
  number: string;
  title: string;
  body: string;
  targetLabel: string;
  targetValue: string;
  Illustration: ComponentType<{ className?: string }>;
  figureCaption: string;
}

export const STEPS: Step[] = [
  {
    kind: "pantry",
    number: "01",
    title: "Open the pantry",
    body: "Tap what is already in your kitchen — vegetables, eggs, that half-onion. Pick 10, 20, or 30 minutes, and flip the vegetarian switch if you want it. No account, no onboarding.",
    targetLabel: "Pick at least",
    targetValue: "2 ingredients",
    Illustration: PantryIllustration,
    figureCaption: "An open pantry of everyday ingredients.",
  },
  {
    kind: "recipes",
    number: "02",
    title: "Take three recipes",
    body: "ChefBOT returns exactly three dishes that fit what you have — never a feed to scroll. Missing items are flagged in red before you commit, so nothing surprises you at the stove.",
    targetLabel: "Always",
    targetValue: "exactly 3 recipes",
    Illustration: RecipesIllustration,
    figureCaption: "Three recipe cards, one selected.",
  },
  {
    kind: "stamp",
    number: "03",
    title: "Stamp the receipt",
    body: "Cooked it? Hit the stamp, approve in MetaMask, and the dish lands in your kitchen and the public leaderboard on BOT Chain. One transaction, one permanent receipt.",
    targetLabel: "One tap",
    targetValue: "1 transaction on-chain",
    Illustration: StampIllustration,
    figureCaption: "A receipt stamped and recorded on BOT Chain.",
  },
];
