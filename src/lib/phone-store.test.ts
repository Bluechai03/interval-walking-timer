import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The store keeps its memory in the module, so each test starts from a fresh copy.
const fresh = async () => {
  vi.resetModules();
  return import("./phone-store");
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("phone store", () => {
  it("reads what was saved, and a write is saved and remembered", async () => {
    localStorage.setItem("a", "saved");
    const { readRaw, writeRaw } = await fresh();
    expect(readRaw("a")).toBe("saved");
    writeRaw("a", "new");
    expect(localStorage.getItem("a")).toBe("new");
    expect(readRaw("a")).toBe("new");
    expect(readRaw("nothing-here")).toBeNull();
  });

  it("removes a value when it is written as null", async () => {
    localStorage.setItem("a", "saved");
    const { readRaw, writeRaw } = await fresh();
    writeRaw("a", null);
    expect(localStorage.getItem("a")).toBeNull();
    expect(readRaw("a")).toBeNull();
  });

  it("still works from memory when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { readRaw, writeRaw } = await fresh();
    expect(readRaw("a")).toBeNull();
    writeRaw("a", "kept");
    expect(readRaw("a")).toBe("kept");
  });

  it("tells subscribers about a change, and stops once they leave", async () => {
    const { subscribe, writeRaw } = await fresh();
    const listener = vi.fn();
    const leave = subscribe(listener);
    writeRaw("a", "1");
    expect(listener).toHaveBeenCalledTimes(1);
    leave();
    writeRaw("a", "2");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hears another tab change a value, and reads the new one", async () => {
    const { readRaw, subscribe } = await fresh();
    expect(readRaw("a")).toBeNull();
    const listener = vi.fn();
    subscribe(listener);
    localStorage.setItem("a", "from the other tab");
    window.dispatchEvent(new StorageEvent("storage", { key: "a" }));
    expect(listener).toHaveBeenCalled();
    expect(readRaw("a")).toBe("from the other tab");
  });

  it("forgets everything when another tab clears storage", async () => {
    localStorage.setItem("a", "x");
    const { readRaw, subscribe } = await fresh();
    expect(readRaw("a")).toBe("x");
    subscribe(() => {});
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(readRaw("a")).toBeNull();
  });
});

describe("parseWhole", () => {
  it("keeps a whole number in range and falls back for anything else", async () => {
    const { parseWhole } = await fresh();
    expect(parseWhole("12", 10, 90, 23)).toBe(12);
    for (const bad of [null, "", "abc", "5", "120", "40.5"]) expect(parseWhole(bad, 10, 90, 23)).toBe(23);
  });
});
