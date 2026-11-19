import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    // Browser tests live in e2e/ and run with `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
