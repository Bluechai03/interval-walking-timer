import { describe, expect, it } from "vitest";

describe("lock-test page", () => {
  it("exports a page that is kept out of search engines", async () => {
    const mod = await import("./page");
    expect(mod.metadata.robots).toEqual({ index: false, follow: false });
  });
});
