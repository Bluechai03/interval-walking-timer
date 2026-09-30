import { describe, expect, it } from "vitest";
import { formatTime } from "./format-time";

describe("formatTime", () => {
  it("pads seconds to two digits", () => {
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats whole minutes", () => {
    expect(formatTime(180)).toBe("3:00");
  });

  it("rolls seconds over into minutes", () => {
    expect(formatTime(61)).toBe("1:01");
    expect(formatTime(3600)).toBe("60:00");
  });
});
