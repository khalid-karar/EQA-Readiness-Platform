import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    hookTimeout: 30_000,
    setupFiles: ["./vitest.setup.ts"],
    env: {
      EQA_PDF_REUSE_BROWSER: process.env.EQA_PDF_REUSE_BROWSER ?? "true",
    },
    include: [
      "apps/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "apps/web/e2e/**",
    ],
  },
});
