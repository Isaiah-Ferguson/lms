import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Next's tsconfig sets `jsx: "preserve"`, which Vite can't execute.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Lib tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
  },
});
