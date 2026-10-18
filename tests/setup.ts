import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

import { resetCookSession } from "@/lib/cook-session";

afterEach(() => {
  cleanup();
  // Cook results live in a module for the whole visit; each test starts fresh.
  resetCookSession();
});
