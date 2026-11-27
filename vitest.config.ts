import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

const srcDir = fileURLToPath(new URL("src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts?(x)", "tests/**/*.test.ts"],
    // Keep until a default (non-acceptance) test exists. Acceptance must discover tests.
    passWithNoTests: true,
  },
});
