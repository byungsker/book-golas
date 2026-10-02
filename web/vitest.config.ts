import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["tests/e2e/**", "node_modules/**"],
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^server-only$/,
        replacement: path.resolve(__dirname, "./scripts/fixtures/server-only.ts"),
      },
      {
        find: /^next\/navigation$/,
        replacement: path.resolve(__dirname, "./node_modules/next/navigation.js"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
});
