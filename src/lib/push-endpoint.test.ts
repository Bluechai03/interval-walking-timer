import { describe, expect, it } from "vitest";
import { isPushServiceEndpoint } from "./push-endpoint";

describe("isPushServiceEndpoint", () => {
  it("accepts the push services phones use", () => {
    for (const endpoint of [
      "https://web.push.apple.com/QAbc123",
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://db5p.notify.windows.com/?token=abc",
    ]) {
      expect(isPushServiceEndpoint(endpoint), endpoint).toBe(true);
    }
  });

  it("refuses any other address, including ones made to look like a push service", () => {
    for (const endpoint of [
      "https://example.com/push",
      "https://web.push.apple.com.evil.example/abc",
      "https://evilweb.push.apple.com/abc",
      "https://web.push.apple.com@evil.example/abc",
      "https://user:pass@web.push.apple.com/abc",
      "https://web.push.apple.com:8443/abc",
      "https://notify.windows.com.evil.example/abc",
      "http://web.push.apple.com/abc",
      "not a web address",
      "",
    ]) {
      expect(isPushServiceEndpoint(endpoint), endpoint).toBe(false);
    }
  });
});
