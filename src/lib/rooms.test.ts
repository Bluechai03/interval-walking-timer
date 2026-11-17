import { describe, expect, it } from "vitest";
import { isCompleteCode, membersHere, normalizeCode, roomLink, roomMessage, type Member } from "./rooms";

describe("normalizeCode", () => {
  it("accepts any case and ignores spaces and dashes", () => {
    expect(normalizeCode("kl-qm")).toBe("KLQM");
    expect(normalizeCode(" b c d f ")).toBe("BCDF");
  });

  it("keeps only four letters", () => {
    expect(normalizeCode("BCDFGH")).toBe("BCDF");
  });
});

describe("isCompleteCode", () => {
  it("accepts four consonants", () => {
    expect(isCompleteCode("BCDF")).toBe(true);
  });

  it("rejects short codes and vowels", () => {
    expect(isCompleteCode("BCD")).toBe(false);
    expect(isCompleteCode("BCDA")).toBe(false);
  });
});

describe("roomLink", () => {
  it("points at the join page", () => {
    expect(roomLink("https://strutwalk.vercel.app", "BCDF")).toBe(
      "https://strutwalk.vercel.app/friends/join/BCDF",
    );
  });
});

describe("membersHere", () => {
  const now = Date.parse("2026-11-17T10:00:00Z");
  const member = (id: string, secondsAgo: number, removed = false): Member => ({
    user_id: id,
    nickname: id,
    removed,
    last_seen_at: new Date(now - secondsAgo * 1000).toISOString(),
  });

  it("drops people who have gone quiet for over 30 seconds", () => {
    const list = membersHere([member("a", 5), member("b", 31), member("c", 30)], "a", now);
    expect(list.map((m) => m.user_id)).toEqual(["a", "c"]);
  });

  it("judges 'here' on the time it is given, so a phone with a wrong clock isn't fooled", () => {
    // This phone's clock is a minute fast. Told the server's time, it still
    // sees someone who was last seen 5 seconds ago as here.
    const phoneNow = now + 60_000;
    const serverOffset = -60_000;
    const list = membersHere([member("a", 5)], "a", phoneNow + serverOffset);
    expect(list.map((m) => m.user_id)).toEqual(["a"]);
    // Without the correction the same person looks long gone.
    expect(membersHere([member("a", 5)], "a", phoneNow)).toEqual([]);
  });

  it("leaves out removed people", () => {
    expect(membersHere([member("a", 1), member("b", 1, true)], "a", now).map((m) => m.user_id)).toEqual(["a"]);
  });

  it("puts the host first and otherwise keeps the order", () => {
    const list = membersHere([member("b", 1), member("c", 1), member("host", 1)], "host", now);
    expect(list.map((m) => m.user_id)).toEqual(["host", "b", "c"]);
  });
});

describe("roomMessage", () => {
  it("explains the known problems kindly", () => {
    expect(roomMessage({ message: "room_full" })).toContain("full");
    expect(roomMessage({ message: "room_not_found" })).toContain("couldn't find");
    expect(roomMessage({ message: "name_taken" })).toContain("goes by that name");
    expect(roomMessage({ message: "removed" })).toContain("host");
    expect(roomMessage({ message: "already_started" })).toContain("already begun");
  });

  it("is kind about what only the host can do, and never gives a bare command", () => {
    expect(roomMessage({ message: "not_host" })).toContain("host");
    expect(roomMessage({ message: "cannot_remove_self" })).toContain("leave the room");
  });

  it("falls back for anything else", () => {
    expect(roomMessage({ message: "boom" })).toContain("didn't work");
    expect(roomMessage(null)).toContain("didn't work");
  });
});
