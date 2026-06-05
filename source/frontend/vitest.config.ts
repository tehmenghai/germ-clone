import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Playwright specs under tests/e2e/** are driven by `pnpm test:e2e` (playwright.config.ts),
// not vitest. Without this exclude, `vitest run` globs app.spec.ts and crashes on
// Playwright's test.describe(). Vitest owns unit/component tests only.
export default defineConfig({
  // Mirror the tsconfig "@/*" path alias so unit tests can import app modules.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}", "**/*.unit.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    // Default node environment — no unit tests need a DOM yet. Component tests that
    // require one should add `jsdom` (a package.json change) and set environment here.
  },
});
