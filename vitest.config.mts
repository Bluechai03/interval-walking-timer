import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // Each file still gets its own isolated page, but the fake browser is built once per
    // worker, which is most of what a run costs.
    pool: "vmThreads",
    // Browser tests live in e2e/ and run with `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
