import { describe, expect, it } from "vitest";
import { measureOffset, offsetFromSamples } from "./server-clock";

describe("offsetFromSamples", () => {
  it("is the server's time minus ours, taken at the middle of the round trip", () => {
    // We asked at 1000 and heard back at 1200; the server said 5100 at about 1100.
    expect(offsetFromSamples([{ sentAt: 1000, receivedAt: 1200, server: 5100 }])).toBe(4000);
  });

  it("trusts the quickest answer", () => {
    const slow = { sentAt: 0, receivedAt: 2000, server: 10_000 };
    const quick = { sentAt: 5000, receivedAt: 5040, server: 5120 };
    expect(offsetFromSamples([slow, quick])).toBe(100);
  });

  it("is null with no samples", () => {
    expect(offsetFromSamples([])).toBeNull();
  });
});

describe("measureOffset", () => {
  it("ignores answers that never came and returns null if none did", async () => {
    expect(await measureOffset(async () => null, 3)).toBeNull();
  });

  it("reads the server several times", async () => {
    let calls = 0;
    let clock = 0;
    const offset = await measureOffset(
      async () => {
        calls++;
        clock += 50;
        return clock + 1000;
      },
      4,
      () => clock,
    );
    expect(calls).toBe(4);
    expect(offset).toBe(1025);
  });
});
